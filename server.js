const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Configuration from environment variables
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN; // e.g., 'elotouchcare'
const ZENDESK_EMAIL = process.env.ZENDESK_EMAIL;
const ZENDESK_API_TOKEN = process.env.ZENDESK_API_TOKEN;
const PHONE_CUSTOM_FIELD_ID = '31133639456535'; // From your JSON

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
 * Format phone number to E.164 format (+13035872087)
 */
function formatPhoneNumber(phoneStr) {
  if (!phoneStr) return null;
  
  // Remove all non-numeric characters
  const cleaned = phoneStr.replace(/\D/g, '');
  
  // If it already starts with country code, just add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it's 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it already has + just return it
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
    // Search users by phone field
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
    
    const ticket = req.body;
    
    // Validate this is a voice channel ticket
    if (ticket.via?.channel !== 'voice') {
      console.log('Not a voice ticket, skipping');
      return res.status(200).json({ message: 'Not a voice ticket, skipped' });
    }
    
    // Extract phone number from via.source.from.phone
    const rawPhone = ticket.via?.source?.from?.phone;
    if (!rawPhone) {
      console.log('No phone number found in ticket');
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Zendesk Phone Processor running on port ${PORT}`);
  console.log(`Zendesk Subdomain: ${ZENDESK_SUBDOMAIN}`);
  console.log(`Webhook endpoint: /webhook/ticket-created`);
});
