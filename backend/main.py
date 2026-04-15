from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import pathlib
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base, SessionLocal
from models import Sucursal, Usuario, Arqueo, PagoDetalle
from auth import get_password_hash, router as auth_router
from routes import arqueos, sucursales, usuarios, ocr


# ─── Seed ────────────────────────────────────────────────────────────────────

def seed_data():
    db = SessionLocal()
    try:
        if db.query(Sucursal).count() > 0:
            return  # Ya inicializado

        s1 = Sucursal(nombre="El Rey 1", direccion="Av. San Martín 123", activa=True)
        s2 = Sucursal(nombre="El Rey 2", direccion="Calle Rivadavia 456", activa=True)
        s3 = Sucursal(nombre="El Rey 3", direccion="Boulevard Perón 789", activa=True)
        db.add_all([s1, s2, s3])
        db.flush()

        admin = Usuario(
            nombre="Administrador El Rey",
            username="admin",
            email="admin@elrey.com",
            password_hash=get_password_hash("elrey2024"),
            rol="dueno",
            activo=True,
        )
        db.add(admin)

        cajero = Usuario(
            nombre="Axel Ariza",
            username="axel",
            email="axel@elrey.com",
            password_hash=get_password_hash("cajero123"),
            rol="cajero",
            sucursal_id=s2.id,
            activo=True,
        )
        db.add(cajero)

        kcoria = Usuario(
            nombre="K. Coria",
            username="kcoria",
            email=None,
            password_hash=get_password_hash("elrey2026"),
            rol="dueno",
            activo=True,
        )
        db.add(kcoria)
        db.flush()

        arqueo = Arqueo(
            sucursal_id=s2.id,
            cajero_id=cajero.id,
            cajero_nombre="Axel Ariza",
            fecha_apertura=datetime(2026, 4, 4, 8, 58),
            fecha_cierre=datetime(2026, 4, 4, 21, 55),
            monto_inicial=30000.0,
            ventas_efectivo=299041.11,
            total_esperado=329041.11,
            total_real=24340.0,
            diferencia=-304701.11,
            estado="critico",
            origen="foto",
        )
        db.add(arqueo)
        db.flush()

        pagos = [
            PagoDetalle(arqueo_id=arqueo.id, metodo="efectivo",   monto=299041.11, cantidad_transacciones=38),
            PagoDetalle(arqueo_id=arqueo.id, metodo="qr_mp",      monto=144552.62, cantidad_transacciones=17),
            PagoDetalle(arqueo_id=arqueo.id, metodo="qr_naranja", monto=3645.00,   cantidad_transacciones=1),
            PagoDetalle(arqueo_id=arqueo.id, metodo="credito",    monto=62174.05,  cantidad_transacciones=4),
            PagoDetalle(arqueo_id=arqueo.id, metodo="debito",     monto=75296.03,  cantidad_transacciones=9),
            PagoDetalle(arqueo_id=arqueo.id, metodo="otro",       monto=68901.56,  cantidad_transacciones=7),
        ]
        db.add_all(pagos)
        db.commit()
        print("[OK] Datos iniciales creados. Usuario: admin@elrey.com / elrey2024")
    except Exception as e:
        db.rollback()
        print(f"[WARN] Error en seed: {e}")
    finally:
        db.close()


# ─── App lifecycle ───────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    os.makedirs("uploads/tickets", exist_ok=True)
    seed_data()
    yield


app = FastAPI(
    title="El Rey Carnicería API",
    version="1.0.0",
    description="Sistema de gestión de arqueos de caja para la red de sucursales El Rey",
    lifespan=lifespan,
    redirect_slashes=False,
)

_cors_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:4173",
]
_extra = os.getenv("ALLOWED_ORIGINS", "")
if _extra:
    _cors_origins.extend([o.strip() for o in _extra.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads/tickets", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router,       prefix="/auth",       tags=["Auth"])
app.include_router(arqueos.router,    prefix="/arqueos",    tags=["Arqueos"])
app.include_router(sucursales.router, prefix="/sucursales", tags=["Sucursales"])
app.include_router(usuarios.router,   prefix="/usuarios",   tags=["Usuarios"])
app.include_router(ocr.router,        prefix="/ocr",        tags=["OCR"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


# ─── Servir frontend (producción) ─────────────────────────────────────────────
_FRONTEND = pathlib.Path(__file__).parent.parent / "frontend" / "dist"

if _FRONTEND.exists():
    @app.get("/", include_in_schema=False)
    async def serve_root():
        return FileResponse(str(_FRONTEND / "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target = _FRONTEND / full_path
        if target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(_FRONTEND / "index.html"))
else:
    @app.get("/", tags=["Health"])
    def root():
        return {"status": "ok", "app": "El Rey API v1.0 🥩"}
