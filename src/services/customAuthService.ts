import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export const registerUser = async (email: string, password: string) => {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new Error('Пользователь с таким email уже существует');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: passwordHash,
      salt: salt,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const loginUser = async (email: string, password: string) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new Error('Неверный email или пароль');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new Error('Неверный email или пароль');
  }

  return user;
};
