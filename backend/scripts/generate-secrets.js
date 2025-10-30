#!/usr/bin/env node

/**
 * Generate random secrets for deployment
 * 
 * Usage:
 *   node scripts/generate-secrets.js
 */

const crypto = require( 'crypto' );

console.log( '\n🔐 Generating secure secrets for deployment...\n' );

const jwtSecret = crypto.randomBytes( 32 ).toString( 'hex' );
const csrfSecret = crypto.randomBytes( 32 ).toString( 'hex' );

console.log( 'Copy these values to your Render environment variables:\n' );
console.log( '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' );
console.log( `JWT_SECRET=${ jwtSecret }\n` );
console.log( `CSRF_SECRET=${ csrfSecret }\n` );
console.log( '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' );

console.log( '⚠️  Keep these secrets secure and never commit them to Git!\n' );






