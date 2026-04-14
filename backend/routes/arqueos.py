from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, date, timedelta
import os
import requests

from database import get_db
from models import Arqueo, PagoDetalle, Sucursal, Usuario, NotificacionLog
from schemas import ArqueoCreate, ArqueoResponse, ResumenHoy
from auth import get_current_user, require_roles

router = APIRouter()

# Umbrales configurables (en producción vendrían de BD)
UMBRAL_ALERTA: float = float(os.getenv("UMBRAL_ALERTA", "500"))
UMBRAL_CRITICO: float = float(os.getenv("UMBRAL_CRITICO", "5000"))


def calcular_estado(diferencia: float) -> str:
    abs_diff = abs(diferencia)
    if abs_diff < UMBRAL_ALERTA:
        return "ok"
    elif abs_diff < UMBRAL_CRITICO:
        return "alerta"
    return "critico"


def _send_telegram(arqueo_id: int, notification_data: dict):
    """Envía notificación Telegram y registra en log."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")

    if not bot_token or not chat_id or bot_token.startswith("REEMPLAZAR"):
        return

    estado_emoji = "⚠️" if notification_data["estado"] == "alerta" else "🔴"
    mensaje = (
        f"🥩 *El Rey — Alerta de Caja*\n"
        f"Sucursal: {notification_data['sucursal']}\n"
        f"Cajero: {notification_data['cajero']}\n"
        f"Diferencia: ${notification_data['diferencia']:,.2f}\n"
        f"Estado: {estado_emoji} {notification_data['estado'].upper()}\n"
        f"Hora: {notification_data['hora_cierre']}"
    )

    exitoso = False
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": mensaje, "parse_mode": "Markdown"},
            timeout=10,
        )
        exitoso = r.status_code == 200
    except Exception:
        pass

    # Registrar en log (abre su propia sesión para el background task)
    from database import SessionLocal
    db2 = SessionLocal()
    try:
        log = NotificacionLog(
            arqueo_id=arqueo_id,
            canal="telegram",
            mensaje=mensaje,
            exitoso=exitoso,
        )
        db2.add(log)
        db2.commit()
    finally:
        db2.close()


def _load_arqueo(db: Session, arqueo_id: int) -> Arqueo:
    return (
        db.query(Arqueo)
        .options(
            joinedload(Arqueo.sucursal),
            joinedload(Arqueo.cajero),
            joinedload(Arqueo.pagos_detalle),
        )
        .filter(Arqueo.id == arqueo_id)
        .first()
    )


# ─── Rutas de prefijo fijo (van ANTES de /{arqueo_id}) ────────────────────────

@router.get("/resumen/hoy", response_model=ResumenHoy)
def resumen_hoy(
    sucursal_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    today = date.today()
    query = db.query(Arqueo).filter(func.date(Arqueo.fecha_cierre) == today)

    if current_user.rol == "cajero":
        query = query.filter(Arqueo.cajero_id == current_user.id)
    elif current_user.rol == "encargado" and current_user.sucursal_id:
        query = query.filter(Arqueo.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Arqueo.sucursal_id == sucursal_id)

    arqueos = query.all()
    total_ventas = sum(a.ventas_efectivo for a in arqueos)
    total_real = sum(a.total_real for a in arqueos)
    total_esperado = sum(a.total_esperado for a in arqueos)
    promedio_diferencia = (
        sum(a.diferencia for a in arqueos) / len(arqueos) if arqueos else 0.0
    )
    alertas = sum(1 for a in arqueos if a.estado in ["alerta", "critico"])
    sucursales_activas = (
        db.query(func.count(Sucursal.id)).filter(Sucursal.activa == True).scalar() or 0
    )

    return ResumenHoy(
        total_ventas=total_ventas,
        arqueos_cargados=len(arqueos),
        promedio_diferencia=promedio_diferencia,
        sucursales_activas=sucursales_activas,
        alertas=alertas,
        total_real=total_real,
        total_esperado=total_esperado,
    )


@router.get("/exportar/excel")
def exportar_excel(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    sucursal_id: Optional[int] = None,
    cajero_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = db.query(Arqueo).options(
        joinedload(Arqueo.sucursal),
        joinedload(Arqueo.cajero),
        joinedload(Arqueo.pagos_detalle),
    )
    if current_user.rol == "cajero":
        query = query.filter(Arqueo.cajero_id == current_user.id)
    elif current_user.rol == "encargado" and current_user.sucursal_id:
        query = query.filter(Arqueo.sucursal_id == current_user.sucursal_id)

    if fecha_desde:
        query = query.filter(Arqueo.fecha_cierre >= datetime.fromisoformat(fecha_desde))
    if fecha_hasta:
        query = query.filter(Arqueo.fecha_cierre <= datetime.fromisoformat(fecha_hasta))
    if sucursal_id:
        query = query.filter(Arqueo.sucursal_id == sucursal_id)
    if cajero_id:
        query = query.filter(Arqueo.cajero_id == cajero_id)

    arqueos = query.order_by(Arqueo.fecha_cierre.desc()).all()
    result = []
    for a in arqueos:
        result.append(
            {
                "id": a.id,
                "sucursal": a.sucursal.nombre if a.sucursal else "",
                "cajero": a.cajero.nombre if a.cajero else (a.cajero_nombre or ""),
                "fecha_apertura": a.fecha_apertura.isoformat(),
                "fecha_cierre": a.fecha_cierre.isoformat(),
                "monto_inicial": a.monto_inicial,
                "ventas_efectivo": a.ventas_efectivo,
                "total_esperado": a.total_esperado,
                "total_real": a.total_real,
                "diferencia": a.diferencia,
                "estado": a.estado,
                "origen": a.origen,
                "pagos": [
                    {
                        "metodo": p.metodo,
                        "monto": p.monto,
                        "transacciones": p.cantidad_transacciones,
                    }
                    for p in a.pagos_detalle
                ],
            }
        )
    return result


@router.get("/red/semana")
def red_semana(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Datos semanales de todas las sucursales para gráficos."""
    today = date.today()
    week_start = today - timedelta(days=6)
    sucursales = db.query(Sucursal).filter(Sucursal.activa == True).all()

    result = []
    for suc in sucursales:
        semanal = []
        for i in range(7):
            day = week_start + timedelta(days=i)
            arqs = (
                db.query(Arqueo)
                .filter(
                    Arqueo.sucursal_id == suc.id,
                    func.date(Arqueo.fecha_cierre) == day,
                )
                .all()
            )
            semanal.append(
                {
                    "fecha": day.isoformat(),
                    "dia": day.strftime("%a"),
                    "total_ventas": sum(a.ventas_efectivo for a in arqs),
                    "arqueos": len(arqs),
                    "diferencia": sum(a.diferencia for a in arqs),
                }
            )

        today_arqs = (
            db.query(Arqueo)
            .filter(
                Arqueo.sucursal_id == suc.id,
                func.date(Arqueo.fecha_cierre) == today,
            )
            .all()
        )
        result.append(
            {
                "sucursal_id": suc.id,
                "nombre": suc.nombre,
                "ventas_hoy": sum(a.ventas_efectivo for a in today_arqs),
                "diferencia_hoy": sum(a.diferencia for a in today_arqs),
                "arqueos_hoy": len(today_arqs),
                "estado_hoy": (
                    "critico"
                    if any(a.estado == "critico" for a in today_arqs)
                    else "alerta"
                    if any(a.estado == "alerta" for a in today_arqs)
                    else "ok"
                ),
                "semanal": semanal,
            }
        )
    return result


# ─── CRUD ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=ArqueoResponse)
def crear_arqueo(
    arqueo_in: ArqueoCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    total_esperado = arqueo_in.monto_inicial + arqueo_in.ventas_efectivo
    diferencia = arqueo_in.total_real - total_esperado
    estado = calcular_estado(diferencia)

    cajero_id = current_user.id if current_user.rol == "cajero" else None

    arqueo = Arqueo(
        sucursal_id=arqueo_in.sucursal_id,
        cajero_id=cajero_id,
        cajero_nombre=arqueo_in.cajero_nombre,
        fecha_apertura=arqueo_in.fecha_apertura,
        fecha_cierre=arqueo_in.fecha_cierre,
        monto_inicial=arqueo_in.monto_inicial,
        ventas_efectivo=arqueo_in.ventas_efectivo,
        total_esperado=total_esperado,
        total_real=arqueo_in.total_real,
        monto_retiro=arqueo_in.monto_retiro,
        diferencia=diferencia,
        estado=estado,
        origen=arqueo_in.origen,
        imagen_url=arqueo_in.imagen_url,
    )
    db.add(arqueo)
    db.flush()

    for pago in arqueo_in.pagos or []:
        db.add(
            PagoDetalle(
                arqueo_id=arqueo.id,
                metodo=pago.metodo,
                monto=pago.monto,
                cantidad_transacciones=pago.cantidad_transacciones,
            )
        )

    db.commit()
    db.refresh(arqueo)

    if estado in ("alerta", "critico"):
        suc = db.query(Sucursal).filter(Sucursal.id == arqueo_in.sucursal_id).first()
        caj = db.query(Usuario).filter(Usuario.id == cajero_id).first() if cajero_id else None
        notification_data = {
            "sucursal": suc.nombre if suc else "Desconocida",
            "cajero": caj.nombre if caj else (arqueo_in.cajero_nombre or "Desconocido"),
            "diferencia": diferencia,
            "estado": estado,
            "hora_cierre": arqueo_in.fecha_cierre.strftime("%H:%M"),
        }
        background_tasks.add_task(_send_telegram, arqueo.id, notification_data)

    return _load_arqueo(db, arqueo.id)


@router.get("/", response_model=List[ArqueoResponse])
def listar_arqueos(
    sucursal_id: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    cajero_id: Optional[int] = None,
    estado: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = db.query(Arqueo).options(
        joinedload(Arqueo.sucursal),
        joinedload(Arqueo.cajero),
        joinedload(Arqueo.pagos_detalle),
    )

    if current_user.rol == "cajero":
        query = query.filter(Arqueo.cajero_id == current_user.id)
    elif current_user.rol == "encargado" and current_user.sucursal_id:
        query = query.filter(Arqueo.sucursal_id == current_user.sucursal_id)

    if sucursal_id:
        query = query.filter(Arqueo.sucursal_id == sucursal_id)
    if fecha_desde:
        query = query.filter(Arqueo.fecha_cierre >= datetime.fromisoformat(fecha_desde))
    if fecha_hasta:
        query = query.filter(Arqueo.fecha_cierre <= datetime.fromisoformat(fecha_hasta))
    if cajero_id:
        query = query.filter(Arqueo.cajero_id == cajero_id)
    if estado:
        query = query.filter(Arqueo.estado == estado)

    return query.order_by(Arqueo.fecha_cierre.desc()).offset(skip).limit(limit).all()


@router.get("/{arqueo_id}", response_model=ArqueoResponse)
def obtener_arqueo(
    arqueo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    arqueo = _load_arqueo(db, arqueo_id)
    if not arqueo:
        raise HTTPException(status_code=404, detail="Arqueo no encontrado")
    return arqueo


@router.delete("/{arqueo_id}")
def eliminar_arqueo(
    arqueo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("dueno")),
):
    arqueo = db.query(Arqueo).filter(Arqueo.id == arqueo_id).first()
    if not arqueo:
        raise HTTPException(status_code=404, detail="Arqueo no encontrado")
    db.delete(arqueo)
    db.commit()
    return {"detail": "Arqueo eliminado"}
