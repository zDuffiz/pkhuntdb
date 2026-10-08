const configuredVipEmails: string[] = [
  'alyson.1999@hotmail.com',
  // Add one approved donor email per line. This file is deployed only with Edge Functions.
]

export const vipEmails = new Set(configuredVipEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))