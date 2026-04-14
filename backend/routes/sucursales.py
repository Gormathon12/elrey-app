from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, timedelta

from database import get_db
from models import Sucursal, Arqueo
from schemas import SucursalCreate, SucursalResponse, SucursalUpdate
from auth import get_current_user, require_roles
from models import Usuario

router = APIRouter()


@router.get("/", response_model=List[SucursalResponse])
def listar_sucursales(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return db.query(Sucursal).order_by(Sucursal.id).all()


@router.post("/", response_model=SucursalResponse)
def crear_sucursal(
    sucursal_in: SucursalCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("dueno")),
):
    suc = Sucursal(**sucursal_in.model_dump())
    db.add(suc)
    db.commit()
    db.refresh(suc)
    return suc


@router.put("/{sucursal_id}", response_model=SucursalResponse)
def actualizar_sucursal(
    sucursal_id: int,
    sucursal_in: SucursalUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("dueno")),
):
    suc = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not suc:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    for field, value in sucursal_in.model_dump(exclude_unset=True).items():
        setattr(suc, field, value)
    db.commit()
    db.refresh(suc)
    return suc


@router.get("/{sucursal_id}/stats")
def stats_sucursal(
    sucursal_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    suc = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not suc:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    today = date.today()
    week_start = today - timedelta(days=6)

    today_arqs = (
        db.query(Arqueo)
        .filter(
            Arqueo.sucursal_id == sucursal_id,
            func.date(Arqueo.fecha_cierre) == today,
        )
        .all()
    )

    semanal = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        arqs = (
            db.query(Arqueo)
            .filter(
                Arqueo.sucursal_id == sucursal_id,
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

    return {
        "sucursal_id": sucursal_id,
        "nombre": suc.nombre,
        "ventas_hoy": sum(a.ventas_efectivo for a in today_arqs),
        "diferencia_hoy": sum(a.diferencia for a in today_arqs),
        "arqueos_hoy": len(today_arqs),
        "semanal": semanal,
    }
