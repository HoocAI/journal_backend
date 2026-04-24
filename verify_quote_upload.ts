
import http from 'http';

const BASE_URL = 'http://localhost:5000/api/v1'; // Adjust port if needed
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'adminPassword';

function request(method: string, path: string, body?: any, token?: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options: http.RequestOptions = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve(data); // Return text if not JSON
                    }
                } else {
                    reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function main() {
    try {
        console.log('1. Logging in as Admin...');
        const loginData = await request('POST', '/auth/admin/login', {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
        });

        const token = loginData.accessToken;
        if (!token) throw new Error('No access token returned');
        console.log('   Success! Token received.');

        console.log('\n2. Creating a new Quote...');
        const newQuote = {
            text: 'This is a test quote from the verification script.',
            author: 'Test Bot',
            mood: 'JOYFUL',
        };

        const createdQuote = await request('POST', '/admin/quotes', newQuote, token);
        console.log('   Success! Quote created with ID:', createdQuote.id);

        console.log('\n3. Verifying Quote in Admin List...');
        const quotes = await request('GET', '/admin/quotes?mood=JOYFUL', undefined, token);
        const found = quotes.find((q: any) => q.id === createdQuote.id);
        if (found) {
            console.log('   Success! Created quote found in list.');
        } else {
            console.error('   Error: Created quote NOT found in list.');
        }

        console.log('\n4. Verifying Random Quote Endpoint (User facing)...');
        try {
            const randomQuote = await request('GET', '/quotes/random?mood=JOYFUL', undefined, token);
            console.log('   Success! Random quote fetched:', randomQuote);
        } catch (e) {
            console.log(`   Warning: Random quote fetch failed: ${e}`);
        }

        console.log('\n5. Cleaning up (Deleting Quote)...');
        await request('DELETE', `/admin/quotes/${createdQuote.id}`, undefined, token);
        console.log('   Success! Quote deleted.');

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
    }
}

main();
