import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToGoals, addGoal, updateGoal, deleteGoal } from '../services/db';
import { Container, Typography, Button, Box, Fab, CircularProgress, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import GroupIcon from '@mui/icons-material/Group';
import GoalItem from '../components/GoalItem';
import GoalEditor from '../components/GoalEditor';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToGoals(currentUser.uid, (data) => {
        setGoals(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateGoal = async (goalData) => {
    try {
        await addGoal({
            ...goalData,
            userId: currentUser.uid
        });
        setEditorOpen(false);
    } catch (error) {
        console.error("Error creating goal:", error);
    }
  };

  const handleUpdateGoal = async (goalData) => {
    try {
        // Check if goal was just completed (transition from not completed to completed)
        const wasCompleted = currentGoal.completed;
        const isNowCompleted = goalData.completed;

        await updateGoal(currentGoal.id, goalData, currentUser.uid);

        // Award points if completed
        if (!wasCompleted && isNowCompleted) {
             const { addPoints } = await import('../services/db');
             // Award 100 points for completing a goal (can be dynamic based on difficulty)
             await addPoints(currentUser.uid, 100);
             alert("Goal Completed! +100 Points");
        }

        setEditorOpen(false);
        setCurrentGoal(null);
    } catch (error) {
        console.error("Error updating goal:", error);
    }
  };

  const handleEditClick = (goal) => {
      setCurrentGoal(goal);
      setEditorOpen(true);
  };

  const handleNewClick = () => {
      setCurrentGoal(null);
      setEditorOpen(true);
  };

  const handleLogout = async () => {
      await logout();
      navigate('/login');
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">My Goals</Typography>
            <Box>
                <IconButton onClick={() => navigate('/group')} color="primary">
                    <GroupIcon />
                </IconButton>
                <IconButton onClick={handleLogout}>
                    <LogoutIcon />
                </IconButton>
            </Box>
        </Box>

        {loading ? (
            <CircularProgress />
        ) : (
            goals.length === 0 ? (
                <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 5 }}>
                    You have no goals yet. Create one to get started!
                </Typography>
            ) : (
                goals.map(goal => (
                    <GoalItem key={goal.id} goal={goal} onClick={() => handleEditClick(goal)} />
                ))
            )
        )}

        <Fab
            color="primary"
            aria-label="add"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={handleNewClick}
        >
            <AddIcon />
        </Fab>

        <GoalEditor
            open={editorOpen}
            onClose={() => setEditorOpen(false)}
            onSave={currentGoal ? handleUpdateGoal : handleCreateGoal}
            goal={currentGoal}
        />
    </Container>
  );
}
