import '../lib/load-env';
import { answer } from '../lib/agent/answer';

async function main() {
  const question = process.argv.slice(2).join(' ');
  if (!question) {
    console.error('Usage: pnpm answer "your question"');
    process.exit(1);
  }
  console.log(`\nQ: ${question}\n`);
  const { text, steps } = await answer(question);
  console.log(text);
  console.log(`\n(${steps} agent steps)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
