import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box, Typography, TextField, Button, List, ListItem, ListItemText,
    IconButton, Paper, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminPanel({ group, currentUser }) {
  const [newAward, setNewAward] = useState({ name: '', cost: '' });

  const isAdmin = group?.adminIds?.includes(currentUser.uid);

  if (!isAdmin) {
      return null;
  }

  const handleAddAward = async () => {
      if (!newAward.name || !newAward.cost) return;

      const updatedAwards = [
          ...(group.awards || []),
          {
              id: Date.now().toString(),
              name: newAward.name,
              cost: parseInt(newAward.cost, 10)
          }
      ];

      try {
          await updateDoc(doc(db, "groups", group.id), {
              awards: updatedAwards
          });
          setNewAward({ name: '', cost: '' });
      } catch (error) {
          console.error("Error adding award:", error);
      }
  };

  const handleDeleteAward = async (awardId) => {
      const updatedAwards = group.awards.filter(a => a.id !== awardId);
      try {
        await updateDoc(doc(db, "groups", group.id), {
            awards: updatedAwards
        });
    } catch (error) {
        console.error("Error deleting award:", error);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Admin: Manage Awards</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
                label="Award Name"
                size="small"
                value={newAward.name}
                onChange={(e) => setNewAward({...newAward, name: e.target.value})}
            />
             <TextField
                label="Points Cost"
                size="small"
                type="number"
                value={newAward.cost}
                onChange={(e) => setNewAward({...newAward, cost: e.target.value})}
            />
            <Button variant="contained" onClick={handleAddAward}>Add</Button>
        </Box>
        <List>
            {group.awards?.map(award => (
                <ListItem
                    key={award.id}
                    secondaryAction={
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteAward(award.id)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                >
                    <ListItemText primary={award.name} secondary={`${award.cost} Points`} />
                </ListItem>
            ))}
        </List>
    </Paper>
  );
}

AdminPanel.propTypes = {
    group: PropTypes.object,
    currentUser: PropTypes.object.isRequired
};
