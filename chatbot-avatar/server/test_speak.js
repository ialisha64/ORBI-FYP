const axios = require('axios');
require('dotenv').config();

const DID_API = 'https://api.d-id.com';
const key = process.env.DID_API_KEY;
const auth = 'Basic ' + Buffer.from(key + ':').toString('base64');
const headers = { Authorization: auth, 'Content-Type': 'application/json' };

async function run() {
  // Step 1: Create stream
  console.log('1. Creating stream...');
  const create = await axios.post(DID_API + '/talks/streams', {
    source_url: 'https://d-id-public-bucket.s3.amazonaws.com/alice.jpg',
    stream_warmup: true
  }, { headers });

  const { id, session_id } = create.data;
  console.log('   Stream ID:', id);
  console.log('   Has SDP offer:', !!create.data.offer);
  console.log('   ICE servers count:', create.data.ice_servers?.length);

  // Step 2: Try speaking (won't have WebRTC but can see if API accepts it)
  console.log('\n2. Testing speak endpoint (will fail without WebRTC but shows API response)...');
  try {
    const speak = await axios.post(DID_API + '/talks/streams/' + id, {
      script: {
        type: 'text',
        input: 'Hello, I am Orbi your AI assistant.',
        provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' }
      },
      config: { stitch: true },
      session_id
    }, { headers });
    console.log('   Speak response:', JSON.stringify(speak.data).substring(0, 200));
  } catch (e) {
    console.log('   Speak error (expected without WebRTC):', JSON.stringify(e.response?.data || e.message).substring(0, 200));
  }

  // Step 3: Delete stream
  console.log('\n3. Deleting stream...');
  await axios.delete(DID_API + '/talks/streams/' + id, {
    data: { session_id }, headers
  });
  console.log('   Deleted OK');
}

run().catch(e => console.error('Fatal:', e.message));
