import { IsUUID } from 'class-validator';
export class ActivateDemoSubscriptionDto { @IsUUID() userId!: string; @IsUUID() planId!: string; }
