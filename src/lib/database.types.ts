// Tipos del esquema de Vecinos de Cali.
// La base de datos es la fuente de verdad: este archivo solo DESCRIBE el esquema
// existente para tipar la UI. Nunca crear ni alterar objetos de base de datos.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RolVecino = 'doy' | 'recibo'
export type NivelVecino = 'nuevo' | 'verificado' | 'conocido'
export type EstadoArticulo = 'disponible' | 'reservado' | 'entregado' | 'retirado' | 'oculto'
export type CondicionArticulo = 'nuevo' | 'como_nuevo' | 'buen_estado' | 'usado_con_detalles'
export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada' | 'completada'

export const ROLES: RolVecino[] = ['doy', 'recibo']
export const NIVELES: NivelVecino[] = ['nuevo', 'verificado', 'conocido']
export const ESTADOS_ARTICULO: EstadoArticulo[] = [
  'disponible',
  'reservado',
  'entregado',
  'retirado',
  'oculto',
]
export const CONDICIONES: CondicionArticulo[] = [
  'nuevo',
  'como_nuevo',
  'buen_estado',
  'usado_con_detalles',
]
export const ESTADOS_SOLICITUD: EstadoSolicitud[] = [
  'pendiente',
  'aceptada',
  'rechazada',
  'expirada',
  'completada',
]

export type Database = {
  public: {
    Tables: {
      barrios: {
        Row: { id: number; nombre: string; comuna: string | null }
        Insert: { id?: number; nombre: string; comuna?: string | null }
        Update: { nombre?: string; comuna?: string | null }
        Relationships: []
      }
      categorias: {
        Row: { id: number; slug: string; nombre: string; icono: string | null; orden: number | null }
        Insert: { id?: number; slug: string; nombre: string; icono?: string | null; orden?: number | null }
        Update: { slug?: string; nombre?: string; icono?: string | null; orden?: number | null }
        Relationships: []
      }
      // Solo se lee la fila propia.
      perfiles: {
        Row: {
          id: string
          nombre: string | null
          foto_url: string | null
          rol_principal: RolVecino | null
          barrio_id: number | null
          mi_situacion: string | null
          es_admin: boolean
          bloqueado: boolean
          motivo_bloqueo: string | null
          entregas_confirmadas: number
          recibidos_confirmados: number
          suma_estrellas: number
          num_calificaciones: number
          creado_en: string
        }
        // Escribibles: nombre, foto_url, barrio_id, mi_situacion.
        // rol_principal se fija SOLO con la RPC cambiar_rol.
        Insert: {
          id: string
          nombre?: string | null
          foto_url?: string | null
          barrio_id?: number | null
          mi_situacion?: string | null
        }
        Update: {
          nombre?: string | null
          foto_url?: string | null
          barrio_id?: number | null
          mi_situacion?: string | null
        }
        Relationships: []
      }
      // WhatsApp propio. El de la contraparte solo con obtener_whatsapp().
      contactos: {
        Row: { perfil_id: string; whatsapp: string }
        Insert: { perfil_id: string; whatsapp: string }
        Update: { whatsapp?: string }
        Relationships: []
      }
      articulos: {
        Row: {
          id: string
          donante_id: string
          titulo: string
          descripcion: string | null
          categoria_id: number
          barrio_id: number
          condicion: CondicionArticulo
          estado: EstadoArticulo
          solicitudes_abiertas: number
          reservado_para: string | null
          reservado_hasta: string | null
          entregado_a: string | null
          entregado_en: string | null
          creado_en: string
        }
        Insert: {
          id?: string
          donante_id?: string
          titulo: string
          descripcion?: string | null
          categoria_id: number
          barrio_id: number
          condicion: CondicionArticulo
        }
        Update: {
          titulo?: string
          descripcion?: string | null
          categoria_id?: number
          barrio_id?: number
          condicion?: CondicionArticulo
        }
        Relationships: []
      }
      // Máximo 3 por artículo (lo impide un trigger).
      articulo_fotos: {
        Row: { id: string; articulo_id: string; url: string; orden: number }
        Insert: { id?: string; articulo_id: string; url: string; orden?: number }
        Update: { url?: string; orden?: number }
        Relationships: []
      }
      solicitudes: {
        Row: {
          id: string
          articulo_id: string
          solicitante_id: string
          mensaje: string | null
          estado: EstadoSolicitud
          creada_en: string
          respondida_en: string | null
        }
        Insert: {
          id?: string
          articulo_id: string
          solicitante_id?: string
          mensaje?: string | null
        }
        Update: { mensaje?: string | null }
        Relationships: []
      }
      calificaciones: {
        Row: {
          id: string
          articulo_id: string
          autor_id: string
          destinatario_id: string
          estrellas: number
          comentario: string | null
          creada_en: string
        }
        Insert: {
          id?: string
          articulo_id: string
          autor_id?: string
          destinatario_id: string
          estrellas: number
          comentario?: string | null
        }
        Update: { estrellas?: number; comentario?: string | null }
        Relationships: []
      }
      reportes: {
        Row: {
          id: string
          articulo_id: string | null
          perfil_id: string | null
          reportante_id: string
          motivo: string
          detalle: string | null
          resuelto: boolean
          creado_en: string
        }
        Insert: {
          id?: string
          articulo_id?: string | null
          perfil_id?: string | null
          reportante_id?: string
          motivo: string
          detalle?: string | null
        }
        Update: { motivo?: string; detalle?: string | null }
        Relationships: []
      }
    }
    Views: {
      // Lectura pública, sin sesión.
      articulos_publicos: {
        Row: {
          id: string
          titulo: string
          descripcion: string | null
          condicion: CondicionArticulo
          creado_en: string
          entregado_en: string | null
          categoria_slug: string
          categoria: string
          barrio: string
          barrio_id: number
          categoria_id: number
          donante_id: string
          solicitudes_abiertas: number
          estado: EstadoArticulo
          foto_portada: string | null
        }
        Relationships: []
      }
      // SOLO con sesión iniciada. Usar SIEMPRE esta vista para perfiles ajenos.
      // barrio viene null para el rol 'recibo'.
      perfiles_vecinos: {
        Row: {
          id: string
          nombre: string | null
          foto_url: string | null
          rol_principal: RolVecino | null
          barrio: string | null
          mi_situacion: string | null
          nivel: NivelVecino
          entregas_confirmadas: number
          recibidos_confirmados: number
          calificacion: number | null
          num_calificaciones: number
          creado_en: string
        }
        Relationships: []
      }
    }
    Functions: {
      perfil_completo: { Args: { p_id: string }; Returns: boolean }
      puede_publicar: { Args: { p_id: string }; Returns: boolean }
      puede_solicitar: { Args: { p_id: string }; Returns: boolean }
      soy_admin: { Args: Record<string, never>; Returns: boolean }
      cambiar_rol: {
        Args: { p_rol: RolVecino; p_barrio_id?: number | null; p_situacion?: string | null }
        Returns: undefined
      }
      aceptar_solicitud: {
        Args: { p_solicitud_id: string }
        Returns: { whatsapp: string; nombre: string }[]
      }
      obtener_whatsapp: { Args: { p_solicitud_id: string }; Returns: string }
      candidatos_entrega: {
        Args: { p_articulo_id: string }
        Returns: {
          perfil_id: string
          nombre: string | null
          foto_url: string | null
          nivel: NivelVecino
          fue_aceptado: boolean
        }[]
      }
      confirmar_entrega: {
        Args: {
          p_articulo_id: string
          p_receptor_id?: string | null
          p_estrellas?: number | null
          p_comentario?: string | null
        }
        Returns: undefined
      }
      liberar_articulo: { Args: { p_articulo_id: string }; Returns: undefined }
      liberar_reservas_vencidas: { Args: Record<string, never>; Returns: number }
      admin_cola_reportes: { Args: Record<string, never>; Returns: Json[] }
      admin_ocultar_articulo: {
        Args: { p_articulo_id: string; p_reporte_id?: string | null }
        Returns: undefined
      }
      admin_bloquear_vecino: {
        Args: { p_perfil_id: string; p_motivo: string; p_reporte_id?: string | null }
        Returns: undefined
      }
      admin_desbloquear_vecino: { Args: { p_perfil_id: string }; Returns: undefined }
      admin_resolver_reporte: { Args: { p_reporte_id: string }; Returns: undefined }
      admin_borrar_cuenta: { Args: { p_perfil_id: string }; Returns: undefined }
    }
    Enums: {
      rol_vecino: RolVecino
      nivel_vecino: NivelVecino
      estado_articulo: EstadoArticulo
      condicion_articulo: CondicionArticulo
      estado_solicitud: EstadoSolicitud
    }
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database['public']

export type Tabla<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type Vista<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row']

export type Barrio = Tabla<'barrios'>
export type Categoria = Tabla<'categorias'>
export type Perfil = Tabla<'perfiles'>
export type Contacto = Tabla<'contactos'>
export type Articulo = Tabla<'articulos'>
export type ArticuloFoto = Tabla<'articulo_fotos'>
export type Solicitud = Tabla<'solicitudes'>
export type Calificacion = Tabla<'calificaciones'>
export type Reporte = Tabla<'reportes'>
export type ArticuloPublico = Vista<'articulos_publicos'>
export type PerfilVecino = Vista<'perfiles_vecinos'>
