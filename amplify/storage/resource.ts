import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'workshopStorage',
    access: (allow) => ({
        'chatSessionArtifacts/*': [
            allow.authenticated.to(['read', 'write', 'delete'])
        ],
        'global/*': [
            allow.authenticated.to(['read', 'write', 'delete'])
        ]
    })
});