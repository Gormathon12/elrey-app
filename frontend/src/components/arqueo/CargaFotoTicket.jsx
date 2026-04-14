import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PhotoIcon, ArrowUpTrayIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'
import Button from '../ui/Button'

export default function CargaFotoTicket({ onDatosExtraidos }) {
  const [preview, setPreview]     = useState(null)
  const [base64, setBase64]       = useState(null)
  const [mimeType, setMimeType]   = useState('image/jpeg')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef()

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Por favor seleccioná una imagen válida (JPG, PNG, WEBP).')
      return
    }
    setMimeType(file.type)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      setBase64(e.target.result)
      setError(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const onFileChange = (e) => processFile(e.target.files?.[0])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files?.[0])
  }, [processFile])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const analizar = async () => {
    if (!base64) return
    setLoading(true)
    setError(null)
    try {
      const response = await api.post('/ocr/procesar-ticket', {
        imagen_base64: base64,
        mime_type: mimeType,
      })
      if (response.data.success) {
        onDatosExtraidos(response.data.data, response.data.imagen_path)
      } else {
        setError('No se pudieron extraer los datos del ticket.')
      }
    } catch (e) {
      const detail = e.response?.data?.detail || e.message
      setError(`Error al procesar: ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !preview && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-card transition-all duration-200
                    flex flex-col items-center justify-center min-h-[160px] cursor-pointer
                    ${dragging
                      ? 'border-red-deep bg-red-deep/5 scale-[1.01]'
                      : preview
                      ? 'border-transparent'
                      : 'border-red-deep/25 hover:border-red-deep/50 hover:bg-red-deep/3'
                    }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full"
            >
              <img
                src={preview}
                alt="Ticket"
                className="w-full max-h-64 object-contain rounded-ui"
              />
              <button
                onClick={(e) => { e.stopPropagation(); setPreview(null); setBase64(null); setError(null) }}
                className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5
                           text-xs text-gray-600 hover:text-red-mid border border-gray-200"
              >
                Cambiar
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-6 px-4 text-center"
            >
              <PhotoIcon className="w-10 h-10 text-red-deep/30" />
              <p className="text-sm font-medium text-gray-600">
                Arrastrá una foto o tocá para seleccionar
              </p>
              <p className="text-xs text-gray-400">JPG, PNG, WEBP · Foto del ticket de caja</p>
              <div className="flex items-center gap-2 mt-1">
                <ArrowUpTrayIcon className="w-4 h-4 text-red-deep/50" />
                <span className="text-xs text-red-deep font-medium">También podés usar la cámara</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 bg-red-50 border border-red-200
                       rounded-ui px-3 py-2.5 text-sm text-red-700"
          >
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón analizar */}
      <Button
        onClick={analizar}
        disabled={!base64}
        loading={loading}
        className="w-full"
      >
        <SparklesIcon className="w-4 h-4" />
        {loading ? 'Leyendo ticket con IA...' : 'Analizar con IA'}
      </Button>

      {loading && (
        <p className="text-center text-xs text-gray-400 animate-pulse">
          Claude está leyendo tu ticket... esto puede tomar unos segundos
        </p>
      )}
    </div>
  )
}
