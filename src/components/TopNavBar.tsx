"use client"
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppBar, Toolbar, Typography, Button, Menu, MenuItem, IconButton } from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';

import { useAuthenticator } from '@aws-amplify/ui-react';
// import { useUserAttributes } from '@/components/UserAttributesProvider';
import { useUserAttributes } from '@/components/UserAttributesProvider';

import { type Schema } from "@/../amplify/data/resource";
import { generateClient } from 'aws-amplify/api';
const amplifyClient = generateClient<Schema>();

const TopNavBar: React.FC = () => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const { signOut, authStatus } = useAuthenticator(context => [context.user, context.authStatus]);
  const { userAttributes } = useUserAttributes();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCreateNewChat = async () => {
    try {
      const newChatSession = await amplifyClient.models.ChatSession.create({});
      router.push(`/chat/${newChatSession.data!.id}`);
    } catch (error) {
      console.error("Error creating chat session:", error);
      alert("Failed to create chat session.");
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" passHref>
            <Button color="inherit">Home</Button>
          </Link>
          <Link href="/projects" passHref>
            <Button color="inherit">Projects</Button>
          </Link>
          {authStatus === 'authenticated' && (
            <>
              <Link href="/listChats" passHref>
                <Button color="inherit">List Chats</Button>
              </Link>
              <Button color="inherit" onClick={handleCreateNewChat}>Create</Button>
            </>
          )}
        </Typography>
        <div>
          {authStatus === 'authenticated' ? (
            <>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >

                {userAttributes?.email && (
                  <Typography variant="body2" color="inherit" sx={{ ml: 1, mr: 2 }}>
                    {userAttributes.email}
                  </Typography>
                )}
                <AccountCircle />
              </IconButton>

              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={signOut}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              onClick={() => router.push('/auth')}
            >
              Login
            </Button>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default TopNavBar;
