from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RolEnum(str, Enum):
    dueno = "dueno"
    encargado = "encargado"
    cajero = "cajero"


class EstadoEnum(str, Enum):
    ok = "ok"
    alerta = "alerta"
    critico = "critico"


class MetodoPagoEnum(str, Enum):
    efectivo = "efectivo"
    qr_mp = "qr_mp"
    qr_naranja = "qr_naranja"
    credito = "credito"
    debito = "debito"
    otro = "otro"


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# ─── Usuarios ────────────────────────────────────────────────────────────────

class UsuarioBase(BaseModel):
    nombre: str
    username: str
    email: Optional[str] = None
    rol: RolEnum
    sucursal_id: Optional[int] = None
    activo: bool = True


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[RolEnum] = None
    sucursal_id: Optional[int] = None
    activo: Optional[bool] = None
    password: Optional[str] = None


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    username: str
    email: Optional[str] = None
    rol: RolEnum
    sucursal_id: Optional[int] = None
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Sucursales ──────────────────────────────────────────────────────────────

class SucursalBase(BaseModel):
    nombre: str
    direccion: Optional[str] = None
    activa: bool = True


class SucursalCreate(SucursalBase):
    pass


class SucursalUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    activa: Optional[bool] = None


class SucursalResponse(SucursalBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Pagos ───────────────────────────────────────────────────────────────────

class PagoDetalleCreate(BaseModel):
    metodo: MetodoPagoEnum
    monto: float = 0.0
    cantidad_transacciones: int = 0


class PagoDetalleResponse(BaseModel):
    id: int
    arqueo_id: int
    metodo: MetodoPagoEnum
    monto: float
    cantidad_transacciones: int

    class Config:
        from_attributes = True


# ─── Arqueos ─────────────────────────────────────────────────────────────────

class ArqueoCreate(BaseModel):
    sucursal_id: int
    cajero_nombre: Optional[str] = None
    fecha_apertura: datetime
    fecha_cierre: datetime
    monto_inicial: float = 0.0
    ventas_efectivo: float = 0.0
    total_real: float = 0.0
    monto_retiro: float = 0.0
    origen: str = "manual"
    imagen_url: Optional[str] = None
    pagos: Optional[List[PagoDetalleCreate]] = []


class ArqueoResponse(BaseModel):
    id: int
    sucursal_id: int
    cajero_id: Optional[int] = None
    cajero_nombre: Optional[str] = None
    fecha_apertura: datetime
    fecha_cierre: datetime
    monto_inicial: float
    ventas_efectivo: float
    total_esperado: float
    total_real: float
    monto_retiro: float
    diferencia: float
    estado: EstadoEnum
    origen: str
    imagen_url: Optional[str] = None
    created_at: datetime
    sucursal: Optional[SucursalResponse] = None
    cajero: Optional[UsuarioResponse] = None
    pagos_detalle: List[PagoDetalleResponse] = []

    class Config:
        from_attributes = True


# ─── Resúmenes ───────────────────────────────────────────────────────────────

class ResumenHoy(BaseModel):
    total_ventas: float
    arqueos_cargados: int
    promedio_diferencia: float
    sucursales_activas: int
    alertas: int
    total_real: float
    total_esperado: float


class DiaStats(BaseModel):
    fecha: str
    total_ventas: float
    arqueos: int
    diferencia: float


class SucursalStats(BaseModel):
    sucursal_id: int
    nombre: str
    ventas_hoy: float
    diferencia_hoy: float
    arqueos_hoy: int
    semanal: List[DiaStats]


class TelegramTestRequest(BaseModel):
    bot_token: str
    chat_id: str


class UmbralUpdate(BaseModel):
    umbral_alerta: float
    umbral_critico: float
