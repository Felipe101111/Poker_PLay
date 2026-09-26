import { z } from 'zod';

const roomName = z
  .string()
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), 'Room name contains unsafe control characters')
  .transform((value) => value.trim().replace(/\s+/g, ' '))
  .refine((value) => value.length >= 1 && value.length <= 100, 'Room name must be between 1 and 100 characters');

export const createRoomSchema = z
  .object({
    name: roomName,
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
    seatLimit: z.number().int().min(2).max(9),
    minPlayers: z.number().int().min(2).max(9),
    startingStackBB: z.number().int().positive(),
    smallBlind: z.number().int().positive(),
    bigBlind: z.number().int().positive()
  })
  .superRefine((value, context) => {
    if (value.minPlayers > value.seatLimit) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['minPlayers'], message: 'Minimum players cannot exceed seat limit' });
    }
    if (value.bigBlind <= value.smallBlind) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['bigBlind'], message: 'Big blind must be greater than small blind' });
    }
  });

export const roomIdSchema = z.object({ roomId: z.string().uuid('Invalid room id') });

export const joinRoomSchema = z.object({ invitationId: z.string().uuid('Invalid invitation id').optional() });

export const readinessSchema = z.object({ ready: z.boolean() });

export const invitationSchema = z.object({ userId: z.string().uuid('Invalid user id') });

export const invitationIdSchema = z.object({ invitationId: z.string().uuid('Invalid invitation id') });

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type ReadinessInput = z.infer<typeof readinessSchema>;
export type InvitationInput = z.infer<typeof invitationSchema>;
