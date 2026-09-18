/**
 * Creates a teacher account out-of-band (public /register only creates
 * students - see decision 4 in the requirements).
 *
 * Usage:
 *   npm run seed:teacher -- --username=drhossam --email=hossam@example.com --password=SecurePass123
 */
import { prisma } from '../src/config/db';
import { userRepository } from '../src/repositories/user.repository';
import { registerSchema } from '../src/validators/auth.validator';
import { hashPassword } from '../src/utils/password';

function readArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match?.[1] && match[2] !== undefined) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

async function main() {
  // Same format rules as public registration.
  const parsed = registerSchema.safeParse(readArgs(process.argv.slice(2)));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    console.error(`Invalid input: ${issue?.path.join('.')} - ${issue?.message}`);
    console.error('Usage: npm run seed:teacher -- --username=... --email=... --password=...');
    process.exitCode = 1;
    return;
  }
  const { username, email, password } = parsed.data;

  if (await userRepository.findByUsername(username)) {
    console.error(`Username "${username}" is already taken.`);
    process.exitCode = 1;
    return;
  }
  if (await userRepository.findByEmail(email)) {
    console.error(`Email "${email}" is already registered.`);
    process.exitCode = 1;
    return;
  }

  const teacher = await userRepository.createTeacher({
    username,
    email,
    hashPassword: await hashPassword(password),
  });
  console.log(`Created teacher "${teacher.username}" (id ${teacher.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
