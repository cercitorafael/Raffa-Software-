import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RotateCw,
  Sparkles,
  Store as StoreIcon,
  Warehouse,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  FileText,
  Coins,
  KeyRound,
  X,
  Package,
  Layers,
  Info,
  Utensils,
  ShoppingCart,
  HeartPulse,
  Shirt,
  Hammer,
  Cpu,
  Wheat,
  ShoppingBag,
} from 'lucide-react';
import { INDUSTRY_PRESETS, IndustryPreset } from '../../data/industryPresets';
import { sound } from '../../utils/audio';

const renderIndustryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Utensils':
      return <Utensils className="w-6 h-6 text-amber-400" />;
    case 'ShoppingCart':
      return <ShoppingCart className="w-6 h-6 text-emerald-400" />;
    case 'HeartPulse':
      return <HeartPulse className="w-6 h-6 text-rose-400" />;
    case 'Shirt':
      return <Shirt className="w-6 h-6 text-indigo-400" />;
    case 'Hammer':
      return <Hammer className="w-6 h-6 text-orange-400" />;
    case 'Cpu':
      return <Cpu className="w-6 h-6 text-cyan-400" />;
    case 'Wheat':
      return <Wheat className="w-6 h-6 text-yellow-400" />;
    case 'Sparkles':
      return <Sparkles className="w-6 h-6 text-pink-400" />;
    default:
      return <ShoppingBag className="w-6 h-6 text-[#c5a47e]" />;
  }
};

interface RegisterCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (registeredData: { companyId: string; userEmail: string; userName: string }) => void;
}

export const RegisterCompanyModal: React.FC<RegisterCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { registerClientCompany, generateNextCompanyId, companies } = useApp();

  // Step 1: Industry Preset Selection
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>('supermercado');

  // Slug generator helper
  const computeCompanySlugId = (rawName?: string) => {
    const base = (rawName || 'empresa').trim();
    const slug = base
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `empresa-${slug || 'cliente'}-${Date.now()}`;
  };

  // Step 2: Company Data
  const [companyId, setCompanyId] = useState<string>(() => computeCompanySlugId('Supermercado Express'));
  const [companyName, setCompanyName] = useState<string>('');
  const [tradeName, setTradeName] = useState<string>('');
  const [taxNumber, setTaxNumber] = useState<string>('');
  const [city, setCity] = useState<string>('Maputo');
  const [address, setAddress] = useState<string>('Avenida Principal');
  const [phone, setPhone] = useState<string>('+258 84 000 0000');
  const [companyEmail, setCompanyEmail] = useState<string>('');
  const [currency, setCurrency] = useState<string>('MZN');

  // Step 3: Admin User Data
  const [adminName, setAdminName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPin, setAdminPin] = useState<string>('1234');
  const [adminPhone, setAdminPhone] = useState<string>('');
  const [adminNif, setAdminNif] = useState<string>('');

  // Step 4: Initial Store & Warehouse
  const [storeName, setStoreName] = useState<string>('Loja Principal / Sede');
  const [autoLogin, setAutoLogin] = useState<boolean>(true);

  // Status & Error handling
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  if (!isOpen) return null;

  const currentPreset: IndustryPreset =
    INDUSTRY_PRESETS.find((p) => p.id === selectedIndustryId) || INDUSTRY_PRESETS[0];

  const handleSelectIndustry = (preset: IndustryPreset) => {
    setSelectedIndustryId(preset.id);
    if (!companyName || companyName.startsWith('Empresa ')) {
      const newCompName = `Empresa ${preset.name}`;
      const newTradeName = `${preset.name} Express`;
      setCompanyName(newCompName);
      setTradeName(newTradeName);
      setCompanyId(computeCompanySlugId(newTradeName));
    }
    sound.playBeep();
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (activeStep === 1) {
      if (!selectedIndustryId) {
        setErrorMsg('Por favor selecione o ramo de atividade da empresa.');
        sound.playError();
        return;
      }
      setActiveStep(2);
      sound.playBeep();
    } else if (activeStep === 2) {
      if (!companyName.trim()) {
        setErrorMsg('Por favor introduza a Razão Social / Nome da Empresa.');
        sound.playError();
        return;
      }
      if (!taxNumber.trim()) {
        // Auto-generate tax number if empty
        setTaxNumber(`4${Math.floor(10000000 + Math.random() * 90000000)}`);
      }
      setActiveStep(3);
      sound.playBeep();
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    if (activeStep === 3) setActiveStep(2);
    else if (activeStep === 2) setActiveStep(1);
    sound.playBeep();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!adminName.trim()) {
      setErrorMsg('Por favor informe o Nome do Administrador.');
      sound.playError();
      return;
    }

    if (!adminEmail.trim()) {
      setErrorMsg('Por favor informe o Email do Administrador.');
      sound.playError();
      return;
    }

    if (!adminPin.trim() || adminPin.length < 4) {
      setErrorMsg('O PIN de segurança deve ter pelo menos 4 dígitos numéricos.');
      sound.playError();
      return;
    }

    setIsSubmitting(true);

    try {
      const finalCompanyId = companyId.trim() || computeCompanySlugId(tradeName || companyName);

      const result = await registerClientCompany({
        company: {
          id: finalCompanyId,
          name: companyName.trim(),
          tradeName: tradeName.trim() || companyName.trim(),
          industry: currentPreset.name,
          sector: currentPreset.name,
          taxNumber: taxNumber.trim() || `4${Math.floor(10000000 + Math.random() * 90000000)}`,
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          email: companyEmail.trim() || adminEmail.trim(),
          currency,
        },
        adminUser: {
          name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          username: adminUsername.trim() || adminEmail.split('@')[0],
          pin: adminPin.trim(),
          phone: adminPhone.trim() || phone.trim(),
          nif: adminNif.trim(),
        },
        storeName: storeName.trim() || 'Loja Principal / Sede',
        autoLogin,
      });

      if (result.success) {
        if (onSuccess) {
          onSuccess({
            companyId: result.companyId,
            userEmail: adminEmail.trim(),
            userName: adminName.trim(),
          });
        }
        onClose();
      } else {
        setErrorMsg(result.error || 'Erro ao processar cadastro da empresa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#111111] border border-[#282828] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#222222] bg-[#161616] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/20 border border-[#c5a47e]/40 flex items-center justify-center text-[#c5a47e]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-neutral-100">
                  Cadastrar Nova Empresa Cliente
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c5a47e]/20 text-[#c5a47e] font-mono font-bold border border-[#c5a47e]/30">
                  Multi-Ramo
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Cadastro multi-inquilino com sincronização em tempo real na Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-3 border-b border-[#222222] bg-[#0c0c0c] text-xs">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`py-3 px-4 flex items-center justify-center space-x-2 border-b-2 font-medium transition-all ${
              activeStep === 1
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#161616]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-[#222222]">
              1
            </span>
            <span className="truncate">1. Ramo de Atividade</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedIndustryId) setActiveStep(2);
            }}
            className={`py-3 px-4 flex items-center justify-center space-x-2 border-b-2 font-medium transition-all ${
              activeStep === 2
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#161616]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-[#222222]">
              2
            </span>
            <span className="truncate">2. Dados da Empresa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (companyName.trim()) setActiveStep(3);
            }}
            className={`py-3 px-4 flex items-center justify-center space-x-2 border-b-2 font-medium transition-all ${
              activeStep === 3
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#161616]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-[#222222]">
              3
            </span>
            <span className="truncate">3. Administrador & Acesso</span>
          </button>
        </div>

        {/* Modal Body / Steps */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: CHOOSE INDUSTRY PRESET */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-200 mb-1">
                  Qual é o ramo / setor de atividade do novo cliente?
                </h3>
                <p className="text-xs text-neutral-400">
                  O sistema irá carregar automaticamente configurações fiscais, categorias e produtos pré-configurados para este setor.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {INDUSTRY_PRESETS.map((preset) => {
                  const isSelected = selectedIndustryId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectIndustry(preset)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                        isSelected
                          ? 'bg-[#c5a47e]/15 border-[#c5a47e] ring-2 ring-[#c5a47e]/20 shadow-md'
                          : 'bg-[#0d0d0d] border-[#242424] hover:border-neutral-600 hover:bg-[#141414]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-[#181818] border border-[#282828]">
                          {renderIndustryIcon(preset.iconName)}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#c5a47e]" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-100">{preset.name}</h4>
                        <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{preset.defaultCategories.length} categorias</span>
                        <span>{preset.sampleProducts.length} artigos demo</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Preset Preview */}
              {currentPreset && (
                <div className="mt-4 p-4 rounded-xl bg-[#0a0a0a] border border-[#222222] space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#c5a47e]">
                    <Sparkles className="w-4 h-4" />
                    <span>Catálogo Modelo: {currentPreset.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentPreset.defaultCategories.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-[#161616] border border-[#282828] text-[11px] text-neutral-300 flex items-center space-x-1"
                      >
                        <span>{c.icon}</span>
                        <span>{c.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: COMPANY IDENTIFICATION */}
          {activeStep === 2 && (
            <div className="space-y-4 text-xs">
              <div className="bg-[#0e0e0e] p-3.5 rounded-xl border border-[#262626] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-neutral-400 block">
                    ID Multi-Empresa na Base de Dados (Supabase)
                  </span>
                  <span className="font-mono text-xs font-bold text-[#c5a47e]">
                    {companyId}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Isolamento Multi-Tenant</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Razão Social / Nome da Empresa *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompanyName(val);
                        if (!tradeName.trim()) {
                          setCompanyId(computeCompanySlugId(val));
                        }
                      }}
                      placeholder="ex: Comercial do Norte, Lda"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Nome Fantasia / Comercial
                  </label>
                  <div className="relative">
                    <StoreIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={tradeName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTradeName(val);
                        setCompanyId(computeCompanySlugId(val || companyName));
                      }}
                      placeholder="ex: Super Norte Express"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    NUIT / NIF Fiscal *
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="ex: 400123456"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Moeda Principal do Sistema
                  </label>
                  <div className="relative">
                    <Coins className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                    >
                      <option value="MZN">Metical (MZN - Mt)</option>
                      <option value="EUR">Euro (EUR - €)</option>
                      <option value="USD">Dólar Americano (USD - $)</option>
                      <option value="AOA">Kwanza (AOA - Kz)</option>
                      <option value="BRL">Real Brasileiro (BRL - R$)</option>
                      <option value="ZAR">Rand Sul-Africano (ZAR - R)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Cidade / Província
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="ex: Maputo / Matola"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Endereço / Sede
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ex: Av. 24 de Julho, 1234"
                    className="w-full px-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Telefone Comercial
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="ex: +258 84 123 4567"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Email Geral da Empresa
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="ex: contacto@empresa.co.mz"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADMIN USER CREDENTIALS & INITIAL SETUP */}
          {activeStep === 3 && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#c5a47e]/10 border border-[#c5a47e]/30 rounded-xl flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-[#c5a47e] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-neutral-200">
                    Conta Administrador do Novo Cliente
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Este utilizador terá perfil <strong>ADMIN</strong> com controlo total da empresa{' '}
                    <strong>{companyName || tradeName || companyId}</strong> e poderá aceder via Palavra-passe ou PIN.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Nome Completo do Gestor / Administrador *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="ex: Carlos Alberto Silva"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Email de Login *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => {
                        setAdminEmail(e.target.value);
                        if (!adminUsername && e.target.value.includes('@')) {
                          setAdminUsername(e.target.value.split('@')[0]);
                        }
                      }}
                      placeholder="ex: admin@empresa.co.mz"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Nome de Utilizador (Username)
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="ex: admin.carlos"
                    className="w-full px-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Código PIN Numérico de Acesso Rápido POS (4-8 dígitos) *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      maxLength={8}
                      required
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="ex: 1234"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 font-mono tracking-widest focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Telemóvel do Administrador
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="ex: +258 84 999 8888"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    Nome da Loja Inicial / Sede
                  </label>
                  <div className="relative">
                    <StoreIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="ex: Loja Sede / Balcão 1"
                      className="w-full pl-9 pr-3 py-2 bg-[#090909] border border-[#262626] rounded-xl text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>
              </div>

              {/* Auto Login option */}
              <div className="pt-2">
                <label className="flex items-center space-x-2.5 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoLogin}
                    onChange={(e) => setAutoLogin(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[#c5a47e] focus:ring-[#c5a47e]"
                  />
                  <span>
                    Iniciar sessão automaticamente nesta nova empresa ao concluir o registo
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[#222222] bg-[#141414] flex items-center justify-between">
          <div>
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                &larr; Voltar
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {activeStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#c5a47e] text-neutral-950 hover:bg-[#b5946e] flex items-center space-x-2 transition-all cursor-pointer shadow-md"
              >
                <span>Avançar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || !adminName.trim() || !adminEmail.trim()}
                onClick={handleSubmit}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md ${
                  !isSubmitting && adminName.trim() && adminEmail.trim()
                    ? 'bg-[#c5a47e] text-neutral-950 hover:bg-[#b5946e] cursor-pointer'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                }`}
              >
                {isSubmitting ? (
                  <RotateCw className="w-4 h-4 animate-spin text-neutral-950" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? 'A Criar Empresa & Sincronizar Supabase...'
                    : 'Concluir & Criar Empresa'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
