#!/usr/bin/env node
import { PATHS } from './lib/paths.mjs';
import { ensureDirs, listDrafts } from './lib/draft-io.mjs';
import { nextFreeSlot, SLOT_HOURS, TIMEZONE } from './lib/slots.mjs';

await ensureDirs();
const scheduled = await listDrafts(PATHS.draftsScheduled);
const occupied = scheduled.map((d) => d.data.publishAt).filter(Boolean);
const slot = nextFreeSlot(new Date(), occupied);
console.log('Timezone:', TIMEZONE);
console.log('Slots diários:', SLOT_HOURS.map((h) => `${String(h).padStart(2, '0')}:00`).join(', '));
console.log('Próximo livre:', slot.publishAt);
