import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, UserPlus, Settings, CheckSquare, Square, Database, RefreshCw, ChevronDown, ChevronUp, Copy, Check, X, Save, AlertCircle, Loader2 } from 'lucide-react';

// ID da planilha do Google Sheets
const SPREADSHEET_ID = '1kXr-u32PrCVzNRAnDLY1-frhHlsgKNCsWJhCewJocT8';
const SHEET_GID = '422968886'; // GID da aba "dados"

// Definição de todas as colunas disponíveis
const ALL_COLUMNS = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'email', label: 'Email' },
  { key: 'formacao', label: 'Formação' },
  { key: 'matricula', label: 'Número de matrícula' },
  { key: 'ctf', label: 'Cadastro Técnico Federal' },
  { key: 'conselho', label: 'Conselho' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'nascimento', label: 'Data de nascimento' },
  { key: 'orgaoExpedidor', label: 'Órgão expedidor' },
  { key: 'expedicaoRg', label: 'Expedição (RG)' },
  { key: 'endereco', label: 'Endereço completo' },
  { key: 'telFixo', label: 'Telefone Fixo' },
  { key: 'celular', label: 'Celular' },
  { key: 'programa', label: 'Programa' },
  { key: 'lattes', label: 'Link Lattes' },
  { key: 'bancoPix', label: 'Banco PIX' },
  { key: 'agenciaPix', label: 'Agência' },
  { key: 'contaPix', label: 'Conta Corrente' },
  { key: 'banco2', label: 'Banco' },
  { key: 'agencia2', label: 'Agência' },
  { key: 'conta2', label: 'Conta Corrente' },
];

// Grupos de colunas para seleção rápida
const COLUMN_GROUPS = [
  { name: 'Dados Pessoais', columns: ['nome', 'email', 'cpf', 'rg', 'nascimento', 'orgaoExpedidor', 'expedicaoRg'] },
  { name: 'Contato', columns: ['email', 'telFixo', 'celular', 'endereco'] },
  { name: 'Profissional', columns: ['formacao', 'matricula', 'ctf', 'conselho', 'programa', 'lattes'] },
  { name: 'Dados Bancários', columns: ['bancoPix', 'agenciaPix', 'contaPix', 'banco2', 'agencia2', 'conta2'] },
];

const ConsultaCadastro = () => {
  // Estados principais
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Estados de seleção de colunas
  const [selectedColumns, setSelectedColumns] = useState(['nome', 'email', 'cpf', 'celular']);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Estados de busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Estados do formulário de novo cadastro
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPerson, setNewPerson] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Estado para copiar
  const [copiedField, setCopiedField] = useState(null);

  // Função para carregar dados do Google Sheets (formato CSV público)
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    // URL para exportar como CSV usando o GID da aba
    const googleUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    
    // Lista de métodos para tentar (direto + proxies)
    const fetchMethods = [
      // Método 1: Direto
      () => fetch(googleUrl),
      // Método 2: Proxy AllOrigins
      () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(googleUrl)}`),
      // Método 3: Proxy corsproxy.io
      () => fetch(`https://corsproxy.io/?${encodeURIComponent(googleUrl)}`),
    ];
    
    let csvText = null;
    let lastError = null;
    
    for (const fetchMethod of fetchMethods) {
      try {
        const response = await fetchMethod();
        if (response.ok) {
          const text = await response.text();
          // Verifica se é realmente CSV (não uma página de erro HTML)
          if (text && !text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
            csvText = text;
            break;
          }
        }
      } catch (err) {
        lastError = err;
        console.log('Tentativa falhou, tentando próximo método...', err);
      }
    }
    
    if (!csvText) {
      setError('Erro ao carregar dados. Verifique se a planilha está configurada como pública e tente novamente.');
      setLoading(false);
      return;
    }
    
    try {
      
      // Parse do CSV
      const lines = csvText.split('\n');
      const headers = parseCSVLine(lines[0]); // Primeira linha são os cabeçalhos
      
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        const obj = {};
        
        // Mapeia cada coluna para a chave correspondente
        ALL_COLUMNS.forEach((col, index) => {
          obj[col.key] = values[index] ? values[index].trim() : '';
        });
        
        if (obj.nome) { // Só adiciona se tiver nome
          rows.push(obj);
        }
      }
      
      setData(rows);
      setLastUpdate(new Date());
      
      if (rows.length === 0) {
        setError('Nenhum registro encontrado na planilha.');
      }
      
    } catch (err) {
      console.error('Erro ao processar dados:', err);
      setError('Erro ao processar os dados da planilha.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função auxiliar para parse de linha CSV (trata campos com vírgulas entre aspas)
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result;
  };

  // Carrega dados na inicialização
  useEffect(() => {
    loadData();
  }, []);

  // Filtro de sugestões de busca
  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return data.filter(person => 
      person.nome && person.nome.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [searchTerm, data]);

  // Toggle de coluna
  const toggleColumn = (key) => {
    if (key === 'nome') return; // Nome é obrigatório
    setSelectedColumns(prev => 
      prev.includes(key) 
        ? prev.filter(c => c !== key)
        : [...prev, key]
    );
  };

  // Selecionar grupo de colunas
  const selectGroup = (groupColumns) => {
    const newSelection = ['nome', ...groupColumns.filter(c => c !== 'nome')];
    setSelectedColumns([...new Set(newSelection)]);
  };

  // Selecionar todas
  const selectAll = () => {
    setSelectedColumns(ALL_COLUMNS.map(c => c.key));
  };

  // Limpar seleção (manter só nome)
  const clearSelection = () => {
    setSelectedColumns(['nome']);
  };

  // Copiar para clipboard
  const copyToClipboard = async (text, fieldKey) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Selecionar pessoa da busca
  const selectPerson = (person) => {
    setSelectedPerson(person);
    setSearchTerm(person.nome);
    setShowSuggestions(false);
  };

  // Limpar busca
  const clearSearch = () => {
    setSearchTerm('');
    setSelectedPerson(null);
    setShowSuggestions(false);
  };

  // Salvar novo cadastro (simulado - mostra os dados)
  const handleSaveNew = async () => {
    if (!newPerson.nome) {
      alert('O campo Nome é obrigatório!');
      return;
    }
    
    setSaving(true);
    
    // Simula salvamento (em produção, usaria Google Sheets API)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Adiciona aos dados locais
    setData(prev => [...prev, newPerson]);
    
    setSaving(false);
    setSaveSuccess(true);
    
    setTimeout(() => {
      setSaveSuccess(false);
      setShowAddForm(false);
      setNewPerson({});
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-lg mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Consulta de Cadastro
          </h1>
          <p className="text-blue-200 text-sm md:text-base">
            Sistema de consulta de dados cadastrais
          </p>
          {lastUpdate && (
            <p className="text-blue-300/60 text-xs mt-2">
              Última atualização: {lastUpdate.toLocaleString('pt-BR')}
            </p>
          )}
        </div>

        {/* Barra de ações */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
          >
            <Settings className="w-4 h-4" />
            Configurar Campos
            {showColumnSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-xl transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Novo Cadastro
          </button>
          
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/80 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Seletor de Colunas */}
        {showColumnSelector && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Selecione os campos que deseja visualizar
            </h3>
            
            {/* Grupos rápidos */}
            <div className="flex flex-wrap gap-2 mb-4">
              {COLUMN_GROUPS.map(group => (
                <button
                  key={group.name}
                  onClick={() => selectGroup(group.columns)}
                  className="px-3 py-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-blue-100 text-sm rounded-lg transition-all"
                >
                  {group.name}
                </button>
              ))}
              <button
                onClick={selectAll}
                className="px-3 py-1.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-100 text-sm rounded-lg transition-all"
              >
                Selecionar Todos
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 text-red-100 text-sm rounded-lg transition-all"
              >
                Limpar
              </button>
            </div>
            
            {/* Grid de colunas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {ALL_COLUMNS.map(col => (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  disabled={col.required}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                    selectedColumns.includes(col.key)
                      ? 'bg-blue-500/40 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  } ${col.required ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {selectedColumns.includes(col.key) ? (
                    <CheckSquare className="w-4 h-4 text-blue-300" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span className="truncate">{col.label}</span>
                </button>
              ))}
            </div>
            
            <p className="text-white/40 text-xs mt-3">
              {selectedColumns.length} campo(s) selecionado(s) • O campo "Nome" é obrigatório
            </p>
          </div>
        )}

        {/* Campo de Busca */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                    if (!e.target.value) setSelectedPerson(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Digite o nome para buscar..."
                  className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent text-lg"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Sugestões */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-white/20 rounded-xl shadow-2xl overflow-hidden">
                {suggestions.map((person, index) => (
                  <button
                    key={index}
                    onClick={() => selectPerson(person)}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 flex items-center gap-3 border-b border-white/10 last:border-0"
                  >
                    <User className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">{person.nome}</p>
                      {person.email && (
                        <p className="text-white/50 text-sm">{person.email}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Resultado da Busca */}
        {selectedPerson && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/20">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedPerson.nome}</h2>
                <p className="text-blue-200 text-sm">Dados cadastrais</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedColumns
                .filter(key => key !== 'nome')
                .map(key => {
                  const col = ALL_COLUMNS.find(c => c.key === key);
                  const value = selectedPerson[key] || '-';
                  
                  return (
                    <div 
                      key={key}
                      className="bg-white/5 rounded-xl p-4 group hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-blue-300/70 text-xs font-medium uppercase tracking-wide mb-1">
                            {col?.label}
                          </p>
                          <p className="text-white text-base break-words">
                            {col?.key === 'lattes' && value !== '-' ? (
                              <a 
                                href={value} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                              >
                                {value}
                              </a>
                            ) : value}
                          </p>
                        </div>
                        {value !== '-' && (
                          <button
                            onClick={() => copyToClipboard(value, key)}
                            className="ml-2 p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Copiar"
                          >
                            {copiedField === key ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Lista de pessoas (quando não há busca) */}
        {!selectedPerson && !searchTerm && data.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Cadastros disponíveis ({data.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.slice(0, 12).map((person, index) => (
                <button
                  key={index}
                  onClick={() => selectPerson(person)}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-left"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500/50 to-cyan-500/50 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{person.nome}</p>
                    <p className="text-white/50 text-sm truncate">{person.email || '-'}</p>
                  </div>
                </button>
              ))}
            </div>
            {data.length > 12 && (
              <p className="text-white/40 text-sm mt-4 text-center">
                Use a busca para encontrar mais cadastros...
              </p>
            )}
          </div>
        )}

        {/* Modal de Novo Cadastro */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-6 h-6" />
                  Novo Cadastro
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPerson({});
                  }}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {saveSuccess ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-white text-lg">Cadastro salvo com sucesso!</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_COLUMNS.map(col => (
                      <div key={col.key} className={col.key === 'endereco' ? 'md:col-span-2' : ''}>
                        <label className="block text-blue-300/70 text-xs font-medium uppercase tracking-wide mb-1">
                          {col.label} {col.required && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type={col.key === 'email' ? 'email' : col.key === 'nascimento' || col.key === 'expedicaoRg' ? 'date' : 'text'}
                          value={newPerson[col.key] || ''}
                          onChange={(e) => setNewPerson(prev => ({ ...prev, [col.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                          placeholder={col.label}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewPerson({});
                      }}
                      className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveNew}
                      disabled={saving || !newPerson.nome}
                      className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Salvar Cadastro
                        </>
                      )}
                    </button>
                  </div>
                  
                  <p className="text-white/40 text-xs mt-4 text-center">
                    Nota: Para salvar permanentemente na planilha, é necessário configurar a API do Google Sheets.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* CSS para animação */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ConsultaCadastro;
