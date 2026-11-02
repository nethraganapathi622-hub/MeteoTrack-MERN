const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const user = await User.findOne({
            email: 'admin@meteotrack.com'
        });

        if (!user) {
            console.log('Admin user not found!');
            return;
        }

        rl.question('Enter your new Admin password: ', async (password) => {
            if (!password || password.length < 8) {
                console.log('Password must be at least 8 characters.');
                rl.close();
                await mongoose.disconnect();
                return;
            }

            user.password = password;
            await user.save();

            console.log('Admin password updated successfully!');
            rl.close();
            await mongoose.disconnect();
        });

    } catch (error) {
        console.error(error);
        rl.close();
        await mongoose.disconnect();
    }
}

resetPassword();