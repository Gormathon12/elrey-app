from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import base64
import json
import os
import re
import uuid
from pathlib import Path

from auth import get_current_user
from models import Usuario

router = APIRouter()


class OCRRequest(BaseModel):
    imagen_base64: str
    mime_type: str = "image/jpeg"


@router.post("/procesar-ticket")
async def procesar_ticket(
    request: OCRRequest,
    current_user: Usuario = Depends(get_current_user),
):
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key.startswith("REEMPLAZAR") or api_key.startswith("sk-ant-REEMPLAZAR"):
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY no configurada. Configurá tu clave en backend/.env",
        )

    # Limpiar prefijo data URL si está presente
    img_data = request.imagen_base64
    if "," in img_data:
        img_data = img_data.split(",")[1]

    # Guardar imagen en disco
    upload_dir = Path(os.getenv("UPLOAD_DIR", "./uploads/tickets"))
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = "jpg" if "jpeg" in request.mime_type else request.mime_type.split("/")[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = upload_dir / filename
    try:
        filepath.write_bytes(base64.b64decode(img_data))
    except Exception:
        pass

    system_prompt = (
        "Sos un asistente experto en leer tickets de arqueo de caja de Argentina. "
        "Extraé EXACTAMENTE los siguientes campos del ticket y devolvé SOLO JSON válido, sin texto extra:\n"
        '{\n'
        '  "cajero": "string",\n'
        '  "sucursal": "string",\n'
        '  "apertura": "string (HH:MM)",\n'
        '  "cierre": "string (HH:MM)",\n'
        '  "fecha": "string (DD/MM/YYYY)",\n'
        '  "monto_inicial": number,\n'
        '  "ventas_efectivo": number,\n'
        '  "total_esperado": number,\n'
        '  "total_real": number,\n'
        '  "diferencia": number,\n'
        '  "pagos": {\n'
        '    "efectivo": { "monto": number, "transacciones": number },\n'
        '    "qr_mercado_pago": { "monto": number, "transacciones": number },\n'
        '    "qr_naranja": { "monto": number, "transacciones": number },\n'
        '    "tarjeta_credito": { "monto": number, "transacciones": number },\n'
        '    "tarjeta_debito": { "monto": number, "transacciones": number },\n'
        '    "otro": { "monto": number, "transacciones": number }\n'
        '  }\n'
        '}\n'
        "Si un campo no existe en el ticket, usá null. Los montos son en pesos argentinos, sin símbolo."
    )

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": request.mime_type,
                                "data": img_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": "Analizá este ticket de arqueo y devolvé los datos en JSON.",
                        },
                    ],
                }
            ],
        )

        response_text = message.content[0].text.strip()

        # Extraer JSON de bloques de código si los hay
        json_match = re.search(r"```(?:json)?\s*([\s\S]+?)```", response_text)
        if json_match:
            response_text = json_match.group(1).strip()

        data = json.loads(response_text)

        return {
            "success": True,
            "data": data,
            "imagen_path": f"/uploads/tickets/{filename}",
        }

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=422,
            detail=f"No se pudo parsear la respuesta del OCR: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar el ticket: {str(e)}",
        )


@router.post("/test-telegram")
def test_telegram(
    bot_token: str,
    chat_id: str,
    current_user: Usuario = Depends(get_current_user),
):
    import requests as req

    mensaje = "🥩 *El Rey* — Prueba de notificación. ¡Todo funciona correctamente!"
    try:
        r = req.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": mensaje, "parse_mode": "Markdown"},
            timeout=10,
        )
        if r.status_code == 200:
            return {"success": True, "detail": "Notificación enviada correctamente"}
        return {"success": False, "detail": r.json().get("description", "Error desconocido")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
