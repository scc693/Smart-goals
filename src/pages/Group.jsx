import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToGroupLeaderboard, createGroup, joinGroup, getUser, subscribeToGroup } from '../services/db';
import { Container, Typography, Button, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Card, CardContent } from '@mui/material';
import Leaderboard from '../components/Leaderboard';
import AdminPanel from '../components/AdminPanel';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function GroupPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userGroupIds, setUserGroupIds] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch User's Group Status
  useEffect(() => {
      async function fetchUserGroups() {
          if (!currentUser) return;
          const userData = await getUser(currentUser.uid);
          if (userData && userData.groupIds) {
              setUserGroupIds(userData.groupIds);
          }
          setLoading(false);
      }
      fetchUserGroups();
  }, [currentUser]);

  // Subscribe to the active group (first one for MVP)
  useEffect(() => {
      if (userGroupIds.length === 0) return;

      const activeGroupId = userGroupIds[0];
      const unsubscribeGroup = subscribeToGroup(activeGroupId, (groupData) => {
          setCurrentGroup(groupData);
      });

      return () => unsubscribeGroup();
  }, [userGroupIds]);

  // Subscribe to Leaderboard for the active group
  useEffect(() => {
      if (!currentGroup || !currentGroup.memberIds) return;

      const unsubscribeLeaderboard = subscribeToGroupLeaderboard(currentGroup.memberIds, (users) => {
          setLeaderboardData(users);
      });

      return () => unsubscribeLeaderboard();
  }, [currentGroup]);

  const handleCreateGroup = async () => {
      try {
          const newGroupId = await createGroup(groupName, currentUser.uid);
          setUserGroupIds([newGroupId]); // Update local state to trigger effects
          setCreateDialogOpen(false);
      } catch (error) {
          console.error("Error creating group:", error);
          alert("Error creating group");
      }
  };

  const handleJoinGroup = async () => {
      try {
          await joinGroup(joinGroupId, currentUser.uid);
          setUserGroupIds(prev => [...prev, joinGroupId]);
          setJoinDialogOpen(false);
      } catch (error) {
          console.error("Error joining group:", error);
          alert("Error joining group: " + error.message);
      }
  };

  if (loading) return <Typography>Loading...</Typography>;

  // Scenario 1: User has no groups
  if (userGroupIds.length === 0) {
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
                Back to Dashboard
            </Button>
            <Typography variant="h4" gutterBottom>Social Groups</Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
                Join a group to compete on the leaderboard and earn awards!
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" size="large" onClick={() => setCreateDialogOpen(true)}>
                    Create New Group
                </Button>
                <Button variant="outlined" size="large" onClick={() => setJoinDialogOpen(true)}>
                    Join Existing Group
                </Button>
            </Box>

            {/* Dialogs duplicated below, could refactor */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
                <DialogTitle>Create Group</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="Group Name" fullWidth
                        value={groupName} onChange={(e) => setGroupName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateGroup}>Create</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)}>
                <DialogTitle>Join Group</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="Group ID" fullWidth
                        value={joinGroupId} onChange={(e) => setJoinGroupId(e.target.value)}
                        helperText="Ask your group admin for the Group ID"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleJoinGroup}>Join</Button>
                </DialogActions>
            </Dialog>
        </Container>
      );
  }

  // Scenario 2: User is in a group
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
            Back to Dashboard
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
                <Typography variant="h4">{currentGroup?.name || 'Group'} Leaderboard</Typography>
                <Typography variant="caption" color="text.secondary">Group ID: {currentGroup?.id}</Typography>
            </Box>
            {/* MVP: Only support switching if we had a UI for it. For now, stuck in first group */}
        </Box>

        <Leaderboard users={leaderboardData} />

        <AdminPanel
            group={currentGroup}
            currentUser={currentUser}
        />
    </Container>
  );
}
