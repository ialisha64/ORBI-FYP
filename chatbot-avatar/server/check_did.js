const axios = require('axios');
require('dotenv').config();

const DID_API = 'https://api.d-id.com';
const key = process.env.DID_API_KEY;
console.log('DID key set:', !!key);

const auth = 'Basic ' + Buffer.from(key + ':').toString('base64');
const headers = { Authorization: auth, 'Content-Type': 'application/json' };

// Step 1: Create stream
console.log('Creating stream...');
axios.post(DID_API + '/talks/streams', {
  source_url: 'https://d-id-public-bucket.s3.amazonaws.com/alice.jpg',
  stream_warmup: true
}, { headers })
.then(r => {
  const { id, session_id } = r.data;
  console.log('Stream created:', id, 'session:', session_id);
  console.log('Has offer:', !!r.data.offer);
  console.log('Has ice_servers:', !!r.data.ice_servers);

  // Delete it right away to free the slot
  return axios.delete(DID_API + '/talks/streams/' + id, {
    data: { session_id },
    headers
  }).then(() => console.log('Stream deleted successfully'));
})
.catch(e => {
  const err = e.response ? e.response.data : e.message;
  console.error('Error:', JSON.stringify(err));
});
