const fs = require('fs');
const path = require('path');
const { colorful, colors } = require('./colors');

const ACCOUNTS_DIR = path.join(__dirname, '../accounts');

// Ensure accounts directory exists
if (!fs.existsSync(ACCOUNTS_DIR)) {
    fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
}

const saveAccount = (username, token) => {
    const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(ACCOUNTS_DIR, `${safeUsername}.json`);
    
    const accountData = {
        username,
        token,
        addedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(accountData, null, 2));
    return accountData;
};

const loadAccounts = () => {
    const accounts = [];
    if (!fs.existsSync(ACCOUNTS_DIR)) return accounts;

    const files = fs.readdirSync(ACCOUNTS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(ACCOUNTS_DIR, file)));
            accounts.push(data);
        } catch (err) {
            console.log(colorful(colors.purple, `     Erro ao carregar conta: ${file}`));
        }
    }
    return accounts;
};

const updateLastUsed = (username) => {
    const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(ACCOUNTS_DIR, `${safeUsername}.json`);
    
    if (fs.existsSync(filePath)) {
        const accountData = JSON.parse(fs.readFileSync(filePath));
        accountData.lastUsed = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(accountData, null, 2));
    }
};

const removeAccount = (username) => {
    const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(ACCOUNTS_DIR, `${safeUsername}.json`);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
};

module.exports = {
    saveAccount,
    loadAccounts,
    updateLastUsed,
    removeAccount
};
