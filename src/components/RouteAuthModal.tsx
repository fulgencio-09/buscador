import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, ShieldAlert, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';
import { verifyRouteAuthCode } from '../utils/auth';

interface RouteAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionDescription?: string;
}

export const RouteAuthModal: React.FC<RouteAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionDescription
}) => {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setErrorMsg(null);
      setIsSuccess(false);
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Por favor introduce el código de seguridad.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const result = await verifyRouteAuthCode(code);
    setIsLoading(false);

    if (result.valid) {
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } else {
      setErrorMsg(result.error || 'Código incorrecto. Solo el usuario autorizado puede cambiar la ruta.');
      inputRef.current?.select();
    }
  };

  return (
    <div
      id="route-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Código de Autorización
              </h3>
              <p className="text-xs text-slate-400">
                Seguridad de Rutas y Carpetas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Acceso restringido:</span>
              {actionDescription ? (
                <span>Para <strong>{actionDescription}</strong>, ingresa tu código de autorización personal.</span>
              ) : (
                <span>Solo el usuario con el código autorizado puede cambiar, agregar o modificar la ruta de consulta.</span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="auth-code-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Código de Seguridad / PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                id="auth-code-input"
                type={showCode ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Ingresa el código"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium animate-shake">
              {errorMsg}
            </div>
          )}

          {isSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Código verificado correctamente. Desbloqueando...</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isSuccess}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || isSuccess || !code.trim()}
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <span>Verificando...</span>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Autorizado</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Desbloquear Ruta</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
