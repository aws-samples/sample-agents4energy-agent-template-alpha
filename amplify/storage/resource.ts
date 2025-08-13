import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'workshopStorage',
    access: (allow) => ({
        'chatSessionArtifacts/*': [
            allow.authenticated.to(['read', 'write', 'delete']),
            // allow.guest.to(['read'])
        ],
        'global/*': [
            allow.authenticated.to(['read', 'write', 'delete']),
            // allow.guest.to(['read'])
        ]
    })
});