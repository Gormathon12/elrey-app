from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Usuario
from schemas import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from auth import get_current_user, require_roles, get_password_hash

router = APIRouter()


@router.get("/", response_model=List[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("dueno", "encargado")),
):
    query = db.query(Usuario)
    if current_user.rol == "encargado" and current_user.sucursal_id:
        query = query.filter(Usuario.sucursal_id == current_user.sucursal_id)
    return query.order_by(Usuario.nombre).all()


@router.post("/", response_model=UsuarioResponse)
def crear_usuario(
    usuario_in: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("dueno")),
):
    existing = db.query(Usuario).filter(Usuario.username == usuario_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    user = Usuario(
        nombre=usuario_in.nombre,
        username=usuario_in.username,
        email=usuario_in.email or None,
        password_hash=get_password_hash(usuario_in.password),
        rol=usuario_in.rol,
        sucursal_id=usuario_in.sucursal_id,
        activo=usuario_in.activo,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def actualizar_usuario(
    usuario_id: int,
    usuario_in: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("dueno")),
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    data = usuario_in.model_dump(exclude_unset=True)
    if "password" in data:
        data["password_hash"] = get_password_hash(data.pop("password"))

    for field, value in data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{usuario_id}")
def desactivar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("dueno")),
):
    if usuario_id == current_user.id:
        raise HTTPException(status_code=400, detail="No podés desactivar tu propio usuario")
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.activo = False
    db.commit()
    return {"detail": "Usuario desactivado"}
