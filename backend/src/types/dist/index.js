"use strict";
exports.__esModule = true;
exports.CategoriaColaborador = exports.StatusChamado = exports.StatusDispositivo = void 0;
// Enum para Status de Dispositivos
var StatusDispositivo;
(function (StatusDispositivo) {
    StatusDispositivo[StatusDispositivo["ATIVO"] = 1] = "ATIVO";
    StatusDispositivo[StatusDispositivo["INATIVO"] = 2] = "INATIVO";
    StatusDispositivo[StatusDispositivo["MANUTENCAO"] = 3] = "MANUTENCAO";
})(StatusDispositivo = exports.StatusDispositivo || (exports.StatusDispositivo = {}));
// Enum para Status de Chamados  
var StatusChamado;
(function (StatusChamado) {
    StatusChamado[StatusChamado["ABERTO"] = 1] = "ABERTO";
    StatusChamado[StatusChamado["EM_ANDAMENTO"] = 2] = "EM_ANDAMENTO";
    StatusChamado[StatusChamado["FECHADO"] = 3] = "FECHADO";
})(StatusChamado = exports.StatusChamado || (exports.StatusChamado = {}));
// Enum para Categorias de Colaboradores
var CategoriaColaborador;
(function (CategoriaColaborador) {
    CategoriaColaborador[CategoriaColaborador["TECNICO"] = 1] = "TECNICO";
    CategoriaColaborador[CategoriaColaborador["ENGENHEIRO"] = 2] = "ENGENHEIRO";
    CategoriaColaborador[CategoriaColaborador["SUPERVISOR"] = 3] = "SUPERVISOR";
    CategoriaColaborador[CategoriaColaborador["ADMINISTRADOR"] = 4] = "ADMINISTRADOR";
    CategoriaColaborador[CategoriaColaborador["GERENTE"] = 5] = "GERENTE";
})(CategoriaColaborador = exports.CategoriaColaborador || (exports.CategoriaColaborador = {}));
