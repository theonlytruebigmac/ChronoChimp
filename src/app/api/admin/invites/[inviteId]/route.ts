import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Params {
  params: { inviteId: string };
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    // TODO: Add admin authentication check here
    
    // Fix: Use the inviteId directly without destructuring to avoid the async params issue
    const inviteId = params.inviteId;
    
    // Check if the invite exists
    const checkStmt = db.prepare('SELECT id FROM user_invites WHERE id = ?');
    const existingInvite = checkStmt.get(inviteId);
    
    if (!existingInvite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    
    // Delete the invite
    const deleteStmt = db.prepare('DELETE FROM user_invites WHERE id = ?');
    deleteStmt.run(inviteId);
    
    return NextResponse.json({ message: 'Invite deleted successfully' });
  } catch (error) {
    console.error('Failed to delete invite:', error);
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 });
  }
}
