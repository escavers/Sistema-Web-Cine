import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Message from '../components/Message';
import { Html5Qrcode } from 'html5-qrcode';

export default function AccessValidationPage() {
  const [qrCode, setQrCode] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);
  
  // Modos: 'manual' (escribir ID), 'camara' (cámara real)
  const [mode, setMode] = useState<'manual' | 'camara'>('manual');
  const [cameraActive, setCameraActive] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Estado para la validación manual por código de acceso (XXXX-XXXX)
  const [manualCode, setManualCode] = useState('');

  // Simulación de sonido de escaneo (Beep) usando la API de Audio del navegador
  function playBeep(success: boolean) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime); // Beep agudo para éxito
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth'; // Sonido más rasposo/áspero para error
        osc.frequency.setValueAtTime(150, ctx.currentTime); // Zumbido grave para error
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      // Ignorar fallos de audio si el navegador bloquea la reproducción autónoma
    }
  }

  // Iniciar cámara real
  async function startCamera() {
    setCameraError(null);
    setResult(null);
    setCameraActive(true);

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('reader');
        setHtml5QrCode(scanner);

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            // Extraer el id del boleto si viene con el formato CINE-ID-NIT-FECHA
            // Si el QR tiene guiones, intentamos verificar si es un formato completo
            // Ej: CINE-1-123456-1719289291
            let finalCode = decodedText;
            if (decodedText.startsWith('CINE-')) {
              const parts = decodedText.split('-');
              if (parts.length >= 2) {
                // Buscamos si la segunda parte es un número (idBoleto) o el código de comprobante
                finalCode = parts[1];
              }
            }

            setQrCode(finalCode);
            scanner.stop().then(() => {
              setCameraActive(false);
              handleValidate(finalCode);
            }).catch(err => console.error(err));
          },
          () => {
            // Error silencioso del scanner buscando el QR
          }
        );
      } catch (err: any) {
        console.error('Error al iniciar cámara:', err);
        setCameraError(err.message || 'No se pudo acceder a la cámara. Asegúrese de otorgar permisos.');
        setCameraActive(false);
      }
    }, 150);
  }

  // Detener cámara real
  async function stopCamera() {
    if (html5QrCode) {
      if (html5QrCode.isScanning) {
        try {
          await html5QrCode.stop();
        } catch (err) {
          console.error(err);
        }
      }
      setHtml5QrCode(null);
    }
    setCameraActive(false);
  }

  // Ejecuta la validación en el Backend
  async function handleValidate(code: string) {
    if (!code.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingrese o escanee un código válido.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setResult(null);

    try {
      const response = await api.validarAcceso(code);
      
      if (response.ok) {
        setResult({
          success: true,
          mensaje: response.mensaje,
          detalle: response.detalle || {}
        });
        playBeep(true);
      } else {
        setResult({
          success: false,
          motivo: response.motivo || 'DESCONOCIDO',
          mensaje: response.mensaje
        });
        playBeep(false);
      }
    } catch (err: any) {
      setResult({
        success: false,
        motivo: err.motivo || 'ERROR_CONEXION',
        mensaje: err.message || 'Error de conexión con el servidor. Verifique si la base de datos está activa.'
      });
      playBeep(false);
    } finally {
      setLoading(false);
    }
  }

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error(err));
      }
    };
  }, [html5QrCode]);

  // Detener cámara si cambia de modo
  useEffect(() => {
    if (mode !== 'camara') {
      stopCamera();
    } else {
      startCamera();
    }
  }, [mode]);


  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex rounded-full bg-cinema-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-cinema-gold">
          Módulo de Control
        </div>
        <h2 className="text-3xl font-black text-white">Validación de Pases QR</h2>
        <p className="text-sm text-cinema-gray">
          Vista móvil del Encargado de Acceso para validar boletos en tiempo real.
        </p>
      </div>

      {/* Tabs de Modo de Escaneo */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5 backdrop-blur">
        <button
          type="button"
          onClick={() => { setMode('manual'); setCameraActive(false); setResult(null); }}
          className={`rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition ${
            mode === 'manual' ? 'bg-cinema-gold text-cinema-black' : 'text-cinema-gray hover:text-white'
          }`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => { setMode('camara'); setResult(null); }}
          className={`rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition ${
            mode === 'camara' ? 'bg-cinema-gold text-cinema-black' : 'text-cinema-gray hover:text-white'
          }`}
        >
          Cámara
        </button>
      </div>

      {/* Panel Manual — Ingreso por Código de Acceso */}
      {mode === 'manual' && (
        <div className="card-cine p-6 space-y-5">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-lg font-bold text-white">Ingreso Manual</h3>
            <p className="text-xs text-cinema-gray mt-1">
              Ingrese el código de acceso impreso en el boleto físico o digital (formato <span className="font-mono text-cinema-gold">XXXX-XXXX</span>).
            </p>
          </div>

          <div className="space-y-4">
            {/* Campo único de código */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-cinema-cream uppercase tracking-wider">
                Código de Acceso
              </label>
              <input
                id="manualCodeInput"
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter' && manualCode.trim()) handleValidate(manualCode.trim()); }}
                placeholder="Ej. A8B9-C3D2"
                maxLength={9}
                autoComplete="off"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-2xl font-mono font-black text-center text-cinema-gold placeholder-white/20 tracking-widest focus:border-cinema-gold focus:outline-none focus:ring-1 focus:ring-cinema-gold/30 transition"
              />
              <p className="text-[10px] text-cinema-gray text-center">
                Se acepta con o sin guión (XXXX-XXXX o XXXXXXXX).
              </p>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setManualCode(''); setResult(null); setMessage(null); }}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-3 text-xs uppercase tracking-wider transition-all"
              >
                Limpiar
              </button>
              <button
                type="button"
                id="btnValidarManual"
                onClick={() => handleValidate(manualCode.trim())}
                disabled={loading || !manualCode.trim()}
                className="btn-primary flex-1 font-bold py-3 text-sm uppercase tracking-wider"
              >
                {loading ? 'Validando...' : '✓ Validar Boleto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de Cámara Real */}
      {mode === 'camara' && (
        <div className="card-cine overflow-hidden p-6 space-y-5">
          <h3 className="text-lg font-bold text-white">Lector de Cámara QR</h3>
          
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60">
            {/* Contenedor donde se insertará el elemento de video */}
            <div id="reader" className="absolute inset-0 w-full h-full object-cover"></div>

            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 space-y-4">
                {/* Cuadro de enfoque de QR */}
                <div className="relative h-48 w-48 border-2 border-dashed border-cinema-gold/60 animate-pulse flex items-center justify-center">
                  <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-cinema-gold"></div>
                  <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-cinema-gold"></div>
                  <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-cinema-gold"></div>
                  <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-cinema-gold"></div>
                  
                  {/* Láser de escaneo animado */}
                  <div className="absolute w-full h-0.5 bg-red-500 animate-[bounce_2s_infinite] top-0 shadow-[0_0_10px_#ef4444]"></div>
                  
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cinema-gold/80 bg-black/60 px-2 py-1 rounded">
                    Escaneando...
                  </span>
                </div>
              </div>
            )}

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-black/80">
                <div className="rounded-full bg-white/5 p-4 text-cinema-gray">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Escáner detenido</p>
                  <p className="text-xs text-cinema-gray">Inicie la cámara física para procesar códigos de barra/QR de boletos.</p>
                </div>
                {cameraError && (
                  <p className="text-xs text-red-400 font-semibold max-w-xs">{cameraError}</p>
                )}
                <button
                  onClick={startCamera}
                  className="btn-primary py-2 px-6 text-xs uppercase"
                >
                  Iniciar Cámara
                </button>
              </div>
            )}
          </div>
          
          {cameraActive && (
            <div className="flex justify-center">
              <button
                onClick={stopCamera}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-6 py-2 text-xs font-bold uppercase tracking-wider text-cinema-cream"
              >
                Detener Cámara
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resultados de la validación */}
      {loading && (
        <div className="card-cine p-8 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cinema-gold border-t-transparent"></div>
          <p className="text-xs text-cinema-gray font-bold uppercase tracking-widest animate-pulse">Procesando código...</p>
        </div>
      )}

      {result && !loading && (
        <div className={`card-cine border p-6 space-y-4 shadow-xl transition-all duration-300 ${
          result.success 
            ? 'border-emerald-500/30 bg-emerald-950/20 shadow-emerald-500/5' 
            : 'border-red-500/30 bg-red-950/20 shadow-red-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2.5 ${
              result.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {result.success ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <h4 className={`text-lg font-black ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.success ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
              </h4>
              <p className="text-xs text-cinema-gray">Resultado de control de seguridad</p>
            </div>
          </div>

          <hr className="border-white/5 my-3" />

          <div className="space-y-3">
            <p className="text-sm font-medium text-white">{result.mensaje}</p>

            {result.success && result.detalle && (
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-black/40 p-4 text-xs">
                <div>
                  <p className="text-cinema-gray font-bold uppercase tracking-wider text-[10px]">Película</p>
                  <p className="font-semibold text-white mt-0.5">{result.detalle.pelicula}</p>
                </div>
                <div>
                  <p className="text-cinema-gray font-bold uppercase tracking-wider text-[10px]">Código de Acceso</p>
                  <p className="font-mono font-bold text-cinema-gold mt-0.5 tracking-widest">{result.detalle.codigoAcceso || `#${result.detalle.idBoleto}`}</p>
                </div>
                <div>
                  <p className="text-cinema-gray font-bold uppercase tracking-wider text-[10px]">Sala</p>
                  <p className="font-semibold text-white mt-0.5">
                    {result.detalle.asientoId?.includes('SALA-') 
                      ? 'Sala ' + result.detalle.asientoId.split('-')[1] 
                      : 'Sala ' + result.detalle.asientoId}
                  </p>
                </div>
                <div>
                  <p className="text-cinema-gray font-bold uppercase tracking-wider text-[10px]">Asiento</p>
                  <p className="font-semibold text-cinema-gold mt-0.5 font-mono text-sm">
                    {result.detalle.asientoId?.includes('-') 
                      ? result.detalle.asientoId.split('-').pop() 
                      : result.detalle.asientoId}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-cinema-gray font-bold uppercase tracking-wider text-[10px]">Horario de Función</p>
                  <p className="font-semibold text-white mt-0.5">{result.detalle.horaInicio?.substring(0, 5)} - {result.detalle.horaFin?.substring(0, 5)}</p>
                </div>
              </div>
            )}

            {!result.success && (
              <div className="rounded-xl bg-black/40 p-4 text-xs space-y-1">
                <p className="text-cinema-gray font-bold uppercase tracking-wider text-[10px]">Motivo del Rechazo</p>
                <p className="font-semibold text-red-300 font-mono">{result.motivo}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {message && !loading && (
        <Message type={message.type} text={message.text} />
      )}
    </section>
  );
}
