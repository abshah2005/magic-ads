import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersRepository } from 'src/modules/users/users.repository';


export async function addCredits(
  userId: string,
  amount: number,
  userRepo: UsersRepository,
  reason?: string,
): Promise<number> {
  if (amount <= 0) throw new BadRequestException('Amount to add must be positive');

  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundException('User not found');

  const newCredits = user.creditsAvailable + amount;

  await userRepo.updateUser(userId, {
    creditsAvailable: newCredits,
  });

  console.log(
    `[CreditsUtil] Added ${amount} credits to user ${user.email}. Reason: ${reason || 'N/A'}. New balance: ${newCredits}`,
  );

  return newCredits;
}


export async function consumeCredits(
  userId: string,
  amount: number,
  userRepo: UsersRepository,
  options?: { reason?: string; rollbackOnFail?: boolean },
): Promise<number> {
  if (amount <= 0) throw new BadRequestException('Amount to consume must be positive');

  const { reason, rollbackOnFail = false } = options || {};

  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundException('User not found');

  const newCredits = user.creditsAvailable - amount;

  if (newCredits < 0) {
    if (rollbackOnFail) {
      throw new BadRequestException(
        `Insufficient credits`,
      );
    } else {
      // Consume all remaining credits
      await userRepo.updateUser(userId, {
        creditsConsumed: user.creditsConsumed + user.creditsAvailable,
        creditsAvailable: 0,
      });

      console.log(
        `[CreditsUtil] User ${user.email} credits clamped to 0. Reason: ${reason || 'N/A'}`,
      );
      return 0;
    }
  }

  // Normal consumption
  await userRepo.updateUser(userId, {
    creditsAvailable: newCredits,
    creditsConsumed: user.creditsConsumed + amount,
  });

  console.log(
    `[CreditsUtil] Consumed ${amount} credits from user ${user.email}. Reason: ${reason || 'N/A'}. New balance: ${newCredits}`,
  );

  return newCredits;
}


export async function rollbackCredits(
  userId: string,
  amount: number,
  userRepo: UsersRepository,
  reason?: string,
): Promise<number> {
  return addCredits(userId, amount, userRepo, `Rollback: ${reason || ''}`);
}


export async function hasEnoughCredits(
  userId: string,
  requiredCredits: number,
  userRepo: UsersRepository,
): Promise<boolean> {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundException('User not found');
  return (user.creditsAvailable || 0) >= requiredCredits;
}
