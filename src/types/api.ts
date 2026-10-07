export interface FieldError {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string | null;
  data: T;
  errors: (FieldError | string)[] | null;
}

export interface LoginDTO {
  email: string;
  senha: string;
}

export interface UsuarioAdminDTO {
  idUsuarioAdmin: number;
  nome: string;
  email: string;
  tipoUsuario: string;
}

export interface LoginResultDTO {
  token: string;
  usuario: UsuarioAdminDTO;
}
