import { config } from 'dotenv';

// quiet: dotenv's startup tip would otherwise print to stdout and corrupt the
// MCP server's stdio JSON-RPC stream.
config({ path: '.env', quiet: true });
