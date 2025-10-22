const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Configuration from environment variables
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN;
const ZENDESK_EMAIL = process.env.ZENDESK_EMAIL;
const ZENDESK_API_TOKEN = process.env.ZENDESK_API_TOKEN;
const PHONE_CUSTOM_FIELD_ID = '31133639456535';

// Zendesk API base URL
const ZENDESK_API_BASE = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2`;

// Create axios instance with auth
const zendeskAPI = axios.create({
  baseURL: ZENDESK_API_BASE,
  auth: {
    username: `${ZENDESK_EMAIL}/token`,
    password: ZENDESK_API_TOKEN
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Get full ticket details from Zendesk API
 */
async function getTicketDetails(ticketId) {
  try {
    const response = await zendeskAPI.get(`/tickets/${ticketId}.json`);
    return response.data.ticket;
  } catch (error) {
    console.error('Error fetching ticket:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Format phone number to E.164 format (+13035872087)
 */
function formatPhoneNumber(phoneStr) {
  if (!phoneStr) return null;
  
  const cleaned = phoneStr.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  if (phoneStr.startsWith('+')) {
    return phoneStr;
  }
  
  return `+${cleaned}`;
}

/**
 * Search for existing user by phone number
 */
async function findUserByPhone(phoneNumber) {
  try {
    const response = await zendeskAPI.get('/users/search.json', {
      params: {
        query: `phone:${phoneNumber}`
      }
    });
    
    if (response.data.users && response.data.users.length > 0) {
      console.log(`Found existing user: ${response.data.users[0].id} with phone ${phoneNumber}`);
      return response.data.users[0];
    }
    
    console.log(`No existing user found with phone ${phoneNumber}`);
    return null;
  } catch (error) {
    console.error('Error searching for user:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Update the auto-created user's phone field
 */
async function updateUserPhone(userId, phoneNumber) {
  try {
    await zendeskAPI.put(`/users/${userId}.json`, {
      user: {
        phone: phoneNumber
      }
    });
    console.log(`Updated user ${userId} with phone ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Error updating user phone:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Update ticket with new requester and phone custom field
 */
async function updateTicket(ticketId, requesterId, formattedPhone) {
  try {
    const updateData = {
      ticket: {
        requester_id: requesterId,
        custom_fields: [
          {
            id: PHONE_CUSTOM_FIELD_ID,
            value: formattedPhone
          }
        ]
      }
    };
    
    await zendeskAPI.put(`/tickets/${ticketId}.json`, updateData);
    console.log(`Updated ticket ${ticketId} with requester ${requesterId} and phone ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error('Error updating ticket:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Main webhook handler for ticket created events
 */
app.post('/webhook/ticket-created', async (req, res) => {
  try {
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;
    const ticketId = webhookData.id;
    
    if (!ticketId) {
      console.log('No ticket ID provided');
      return res.status(400).json({ error: 'No ticket ID provided' });
    }
    
    // Fetch full ticket details from Zendesk API
    console.log(`Fetching ticket ${ticketId} from Zendesk API...`);
    const ticket = await getTicketDetails(ticketId);
    
    if (!ticket) {
      console.log('Could not fetch ticket details');
      return res.status(404).json({ error: 'Could not fetch ticket details' });
    }
    
    console.log(`Ticket channel: ${ticket.via?.channel}`);
    
    // Validate this is a voice channel ticket
    if (ticket.via?.channel !== 'voice') {
      console.log('Not a voice ticket, skipping');
      return res.status(200).json({ message: 'Not a voice ticket, skipped' });
    }
    
    // Extract phone number from via.source.from
    const rawPhone = ticket.via?.source?.from?.phone || ticket.via?.source?.from?.address;
    
    if (!rawPhone) {
      console.log('No phone number found in ticket via source');
      console.log('Via source:', JSON.stringify(ticket.via?.source, null, 2));
      return res.status(200).json({ message: 'No phone number found' });
    }
    
    console.log(`Processing ticket ${ticket.id} with phone ${rawPhone}`);
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(rawPhone);
    console.log(`Formatted phone: ${formattedPhone}`);
    
    // Search for existing user with this phone number
    const existingUser = await findUserByPhone(formattedPhone);
    
    let finalRequesterId = ticket.requester_id;
    
    if (existingUser) {
      // User exists - use their ID
      console.log(`Using existing user ${existingUser.id}`);
      finalRequesterId = existingUser.id;
    } else {
      // No existing user - update the auto-created user's phone field
      console.log(`Updating auto-created user ${ticket.requester_id} with phone`);
      await updateUserPhone(ticket.requester_id, formattedPhone);
    }
    
    // Update ticket with correct requester and phone custom field
    await updateTicket(ticket.id, finalRequesterId, formattedPhone);
    
    res.status(200).json({ 
      success: true,
      message: 'Ticket processed successfully',
      ticketId: ticket.id,
      requesterId: finalRequesterId,
      phone: formattedPhone
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'zendesk-phone-processor'
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Zendesk Phone Processor',
    version: '1.0.0',
    endpoints: {
      webhook: 'POST /webhook/ticket-created',
      health: 'GET /health'
    }
  });
});

// Keep track of server instance
let server;

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server gracefully');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.log('Forcing server close after timeout');
      process.exit(1);
    }, 10000);
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server gracefully');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  }
});

// Start server
server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Zendesk Phone Processor running on port ${PORT}`);
  console.log(`Zendesk Subdomain: ${ZENDESK_SUBDOMAIN}`);
  console.log(`Webhook endpoint: /webhook/ticket-created`);
  console.log(`Server ready and listening on 0.0.0.0:${PORT}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
