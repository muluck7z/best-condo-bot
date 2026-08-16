export type TicketMeta = {
  openerId: string;
  openerTag: string;
  typeLabel: string;
  openedAt: Date;
  thumbnailUrl?: string;
};

export const ticketStore = new Map<string, TicketMeta>();
export const ticketPanelConfig = new Map<string, { thumbnailUrl?: string }>();
