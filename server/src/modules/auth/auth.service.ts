import { prisma } from '../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

//create owner credentials
export const registerOwner = async(name: string, email:string, password:string) => {
    // checking if any user exists or not
    const userCount = await prisma.user.count();
    if(userCount > 0){
        throw new Error('Owner account already exists . Sign up is disabled');
    }

    const passwordHash = await bcrypt.hash(password,10);

    const user = await prisma.user.create({
        data: { name,email,passwordHash, role: 'OWNER'}
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role };
};

// login 
export const loginUser = async (email: string, password: string) => {
    const user = await prisma.user.findUnique({ where: { email }});
    if (!user || !user.isActive) throw new Error('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new Error("Invalid credentials!");

    const token = jwt.sign(
        { userId: user.id, role:user.role},
        process.env.JWT_SECRET as string,
        { expiresIn: '1d'}
    );

    return {token, user: {id: user.id, name: user.name, role: user.role}};
};