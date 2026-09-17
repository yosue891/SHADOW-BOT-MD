import type { WASocket } from '../Socket/index.js';
import type { AnyMessageContent } from '../Types/Message.js';

export interface ScheduledMessage {
    id: string;
    jid: string;
    content: AnyMessageContent;
    type: 'once' | 'recurring';
    timestamp?: number;
    cron?: string;
    sent?: boolean;
    sentAt?: number;
    cancelled?: boolean;
    cancelledAt?: number;
    createdAt: number;
    lastSent?: number;
    executionCount?: number;
    lastError?: string;
    errorCount?: number;
    [key: string]: any;
}

export interface SchedulerStats {
    total: number;
    pending: number;
    sent: number;
    recurring: number;
    cancelled: number;
    errors: number;
}

export interface ScheduledMessageFilter {
    jid?: string;
    type?: 'once' | 'recurring';
    cancelled?: boolean;
    pending?: boolean;
}

/**
 * Iniciar el scheduler de mensajes programados
 * @param sock - Socket de conexión de WhatsApp
 * @param intervalMs - Intervalo de revisión en ms (default: 30000)
 */
export declare const startScheduler: (sock: WASocket, intervalMs?: number) => void;

/**
 * Detener el scheduler
 */
export declare const stopScheduler: () => void;

/**
 * Programar un mensaje para enviar en una fecha/hora específica
 * @param jid - Destinatario
 * @param content - Contenido del mensaje
 * @param timestamp - Fecha/hora de envío (timestamp ms o Date)
 * @param options - Opciones adicionales (id personalizado, etc.)
 * @returns ID del mensaje programado
 */
export declare const scheduleMessage: (
    jid: string,
    content: AnyMessageContent,
    timestamp: number | Date,
    options?: { id?: string; [key: string]: any }
) => string;

/**
 * Programar un mensaje recurrente usando cron
 * Formato: "MIN HOUR DOM MON DOW" (ej: "0 9 * * 1-5" = lunes a viernes a las 9am)
 * @param jid - Destinatario
 * @param content - Contenido del mensaje
 * @param cron - Expresión cron
 * @param options - Opciones adicionales
 * @returns ID del mensaje programado
 */
export declare const recurringMessage: (
    jid: string,
    content: AnyMessageContent,
    cron: string,
    options?: { id?: string; [key: string]: any }
) => string;

/**
 * Cancelar un mensaje programado
 * @param id - ID del mensaje
 * @returns true si se canceló
 */
export declare const cancelScheduledMessage: (id: string) => boolean;

/**
 * Eliminar un mensaje programado permanentemente
 * @param id - ID del mensaje
 * @returns true si se eliminó
 */
export declare const deleteScheduledMessage: (id: string) => boolean;

/**
 * Obtener todos los mensajes programados
 * @param filter - Filtros opcionales
 * @returns Lista de mensajes
 */
export declare const listScheduledMessages: (filter?: ScheduledMessageFilter) => ScheduledMessage[];

/**
 * Obtener un mensaje programado por ID
 * @param id - ID del mensaje
 * @returns Mensaje o null
 */
export declare const getScheduledMessage: (id: string) => ScheduledMessage | null;

/**
 * Actualizar el contenido de un mensaje programado
 * @param id - ID del mensaje
 * @param updates - Campos a actualizar
 * @returns true si se actualizó
 */
export declare const updateScheduledMessage: (id: string, updates: Partial<ScheduledMessage>) => boolean;

/**
 * Obtener estadísticas del scheduler
 * @returns Estadísticas
 */
export declare const getSchedulerStats: () => SchedulerStats;
