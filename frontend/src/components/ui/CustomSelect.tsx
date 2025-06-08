/* eslint-disable react-hooks/rules-of-hooks */
// components/ui/CustomSelect.tsx - UX/UI melhorado

import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string | number;
  label: string;
  className?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: Option[];
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  required?: boolean;
  hidden?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  error,
  helperText,
  options,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  hidden = false,
}) => {

  if (hidden){
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleOptionClick(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Scroll para opção destacada
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  const handleOptionClick = (option: Option) => {
    if (option.disabled) return;
    
    onChange?.(option.value);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const toggleDropdown = () => {
    if (disabled) return;
    
    if (!isOpen) {
      setIsOpen(true);
      setHighlightedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative" ref={selectRef}>
        {/* Campo principal */}
        <div
          className={`
            relative form-input cursor-pointer flex items-center justify-between
            transition-all duration-200 ease-in-out
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${disabled ? 'bg-gray-50 cursor-not-allowed text-gray-500' : 'hover:border-gray-400 hover:shadow-sm'}
            ${isOpen ? 'ring-2 ring-primary-500 border-primary-500 shadow-sm' : ''}
          `}
          onClick={toggleDropdown}
        >
          <span className={`
            flex-1 truncate transition-colors duration-150 text-gray-900
            ${selectedOption?.className || ''}
          `}>
            {selectedOption ? selectedOption.label : placeholder || 'Selecione uma opção'}
          </span>
          
          <div className="flex items-center space-x-1 ml-2">
            {/* Botão limpar */}
            {selectedOption && !disabled && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Limpar seleção"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Campo de busca */}
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Buscar item..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Lista de opções */}
            <div 
              ref={listRef}
              className="max-h-60 overflow-y-auto py-1"
            >
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">
                    Nenhum item encontrado
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tente buscar com outros termos
                  </p>
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={`
                      px-4 py-3 text-sm cursor-pointer transition-all duration-150 ease-in-out
                      flex items-center justify-between group
                      ${option.disabled ? 'cursor-not-allowed opacity-50' : ''}
                      ${index === highlightedIndex ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}
                      ${option.value === value ? 'bg-primary-100 text-primary-800 font-medium' : ''}
                      ${option.className?.includes('text-gray-400') ? 'text-gray-400' : 'text-gray-900'}
                    `}
                    onClick={() => handleOptionClick(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="flex-1 truncate">
                      {option.label}
                    </span>
                    
                    {option.value === value && (
                      <svg className="w-4 h-4 text-primary-600 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Footer com info */}
            {filteredOptions.length > 0 && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  {filteredOptions.length} {filteredOptions.length === 1 ? 'item encontrado' : 'itens encontrados'}
                  {searchTerm && (
                    <span className="ml-1">
                      para "{searchTerm}"
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="form-error">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-secondary-500 text-sm mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default CustomSelect;