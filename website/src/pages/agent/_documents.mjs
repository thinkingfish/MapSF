import feed from '../../../public/events.json';
import { agentDocuments } from '../../lib/agent-markdown.mjs';
// Use the same committed snapshot served at /events.json.
export const documents = agentDocuments(feed);
