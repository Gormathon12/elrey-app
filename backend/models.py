from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    ForeignKey, Enum, Text,
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


class RolEnum(str, enum.Enum):
    dueno = "dueno"
    encargado = "encargado"
    cajero = "cajero"


class EstadoEnum(str, enum.Enum):
    ok = "ok"
    alerta = "alerta"
    critico = "critico"


class OrigenEnum(str, enum.Enum):
    manual = "manual"
    foto = "foto"
    sistema = "sistema"


class MetodoPagoEnum(str, enum.Enum):
    efectivo = "efectivo"
    qr_mp = "qr_mp"
    qr_naranja = "qr_naranja"
    credito = "credito"
    debito = "debito"
    otro = "otro"


class Sucursal(Base):
    __tablename__ = "sucursales"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    direccion = Column(String(200), nullable=True)
    activa = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    usuarios = relationship("Usuario", back_populates="sucursal")
    arqueos = relationship("Arqueo", back_populates="sucursal")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=True, index=True)
    password_hash = Column(String(200), nullable=False)
    rol = Column(Enum(RolEnum), nullable=False)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id"), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sucursal = relationship("Sucursal", back_populates="usuarios")
    arqueos = relationship("Arqueo", back_populates="cajero")


class Arqueo(Base):
    __tablename__ = "arqueos"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id"), nullable=False)
    cajero_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    cajero_nombre = Column(String(100), nullable=True)
    fecha_apertura = Column(DateTime, nullable=False)
    fecha_cierre = Column(DateTime, nullable=False)
    monto_inicial = Column(Float, default=0.0)
    ventas_efectivo = Column(Float, default=0.0)
    total_esperado = Column(Float, default=0.0)
    total_real = Column(Float, default=0.0)
    monto_retiro = Column(Float, default=0.0)
    diferencia = Column(Float, default=0.0)
    estado = Column(Enum(EstadoEnum), default=EstadoEnum.ok)
    origen = Column(Enum(OrigenEnum), default=OrigenEnum.manual)
    imagen_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sucursal = relationship("Sucursal", back_populates="arqueos")
    cajero = relationship("Usuario", back_populates="arqueos")
    pagos_detalle = relationship(
        "PagoDetalle", back_populates="arqueo", cascade="all, delete-orphan"
    )
    notificaciones = relationship("NotificacionLog", back_populates="arqueo")


class PagoDetalle(Base):
    __tablename__ = "pagos_detalle"

    id = Column(Integer, primary_key=True, index=True)
    arqueo_id = Column(Integer, ForeignKey("arqueos.id"), nullable=False)
    metodo = Column(Enum(MetodoPagoEnum), nullable=False)
    monto = Column(Float, default=0.0)
    cantidad_transacciones = Column(Integer, default=0)

    arqueo = relationship("Arqueo", back_populates="pagos_detalle")


class NotificacionLog(Base):
    __tablename__ = "notificaciones_log"

    id = Column(Integer, primary_key=True, index=True)
    arqueo_id = Column(Integer, ForeignKey("arqueos.id"), nullable=False)
    canal = Column(String(50), default="telegram")
    mensaje = Column(Text, nullable=True)
    enviado_at = Column(DateTime, default=datetime.utcnow)
    exitoso = Column(Boolean, default=False)

    arqueo = relationship("Arqueo", back_populates="notificaciones")
