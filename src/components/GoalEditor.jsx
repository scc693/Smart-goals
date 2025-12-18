import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, IconButton, Checkbox,
    FormControlLabel, List, ListItem, ListItemText, Typography, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function GoalEditor({ open, onClose, onSave, goal }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    isPrivate: false,
    subGoals: []
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        ...goal,
        deadline: goal.deadline ? new Date(goal.deadline.seconds * 1000).toISOString().split('T')[0] : '',
        subGoals: goal.subGoals || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        deadline: '',
        isPrivate: false,
        subGoals: []
      });
    }
  }, [goal, open]);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'isPrivate' ? checked : value
    }));
  };

  const handleAddSubGoal = () => {
      setFormData(prev => ({
          ...prev,
          subGoals: [...prev.subGoals, { id: Date.now().toString(), title: '', steps: [] }]
      }));
  };

  const handleSubGoalChange = (index, value) => {
      const newSubGoals = [...formData.subGoals];
      newSubGoals[index].title = value;
      setFormData(prev => ({ ...prev, subGoals: newSubGoals }));
  };

  const handleAddStep = (subGoalIndex) => {
      const newSubGoals = [...formData.subGoals];
      newSubGoals[subGoalIndex].steps.push({ id: Date.now().toString(), title: '', completed: false });
      setFormData(prev => ({ ...prev, subGoals: newSubGoals }));
  };

  const handleStepChange = (subGoalIndex, stepIndex, value) => {
      const newSubGoals = [...formData.subGoals];
      newSubGoals[subGoalIndex].steps[stepIndex].title = value;
      setFormData(prev => ({ ...prev, subGoals: newSubGoals }));
  };

  const handleDeleteSubGoal = (index) => {
      const newSubGoals = [...formData.subGoals];
      newSubGoals.splice(index, 1);
      setFormData(prev => ({ ...prev, subGoals: newSubGoals }));
  };

  const handleDeleteStep = (subGoalIndex, stepIndex) => {
    const newSubGoals = [...formData.subGoals];
    newSubGoals[subGoalIndex].steps.splice(stepIndex, 1);
    setFormData(prev => ({ ...prev, subGoals: newSubGoals }));
};

  const toggleStepCompletion = (subGoalIndex, stepIndex) => {
    const newSubGoals = [...formData.subGoals];
    const step = newSubGoals[subGoalIndex].steps[stepIndex];
    step.completed = !step.completed;

    // Recalculate progress
    const totalSteps = newSubGoals.reduce((acc, sg) => acc + (sg.steps ? sg.steps.length : 0), 0);
    const completedSteps = newSubGoals.reduce((acc, sg) => acc + (sg.steps ? sg.steps.filter(s => s.completed).length : 0), 0);

    // Update sub-goal completion status if needed (optional logic)
    // For now, progress is based on total steps
    const newProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    setFormData(prev => ({
        ...prev,
        subGoals: newSubGoals,
        progress: newProgress,
        completed: newProgress === 100
    }));
  };

  const handleSave = () => {
    const dataToSave = {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline) : null
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{goal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          name="title"
          label="Goal Title"
          fullWidth
          value={formData.title}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          name="description"
          label="Description"
          fullWidth
          multiline
          rows={2}
          value={formData.description}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          name="reward"
          label="Personal Reward (e.g., 'Pizza Night')"
          fullWidth
          value={formData.reward || ''}
          onChange={handleChange}
          helperText="A treat for yourself upon completion!"
        />
        <TextField
            margin="dense"
            name="deadline"
            label="Deadline"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={formData.deadline}
            onChange={handleChange}
        />
        <FormControlLabel
            control={<Checkbox checked={formData.isPrivate} onChange={handleChange} name="isPrivate" />}
            label="Private Goal (Hide details on leaderboard)"
        />

        <Typography variant="h6" sx={{ mt: 2 }}>Sub-goals</Typography>
        {formData.subGoals.map((subGoal, index) => (
            <Box key={subGoal.id || index} sx={{ ml: 2, mt: 1, borderLeft: '2px solid #ccc', pl: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                        placeholder="Sub-goal Title"
                        variant="standard"
                        fullWidth
                        value={subGoal.title}
                        onChange={(e) => handleSubGoalChange(index, e.target.value)}
                    />
                    <IconButton onClick={() => handleDeleteSubGoal(index)} color="error"><DeleteIcon /></IconButton>
                </Box>

                <List dense>
                    {subGoal.steps?.map((step, stepIndex) => (
                        <ListItem key={step.id || stepIndex}>
                            <Checkbox
                                edge="start"
                                checked={!!step.completed}
                                onChange={() => toggleStepCompletion(index, stepIndex)}
                                tabIndex={-1}
                                disableRipple
                            />
                             <TextField
                                placeholder="Step"
                                variant="standard"
                                fullWidth
                                value={step.title}
                                onChange={(e) => handleStepChange(index, stepIndex, e.target.value)}
                                sx={{
                                    textDecoration: step.completed ? 'line-through' : 'none',
                                    color: step.completed ? 'text.disabled' : 'inherit'
                                }}
                            />
                            <IconButton onClick={() => handleDeleteStep(index, stepIndex)} size="small"><DeleteIcon fontSize="small" /></IconButton>
                        </ListItem>
                    ))}
                </List>
                <Button startIcon={<AddIcon />} size="small" onClick={() => handleAddStep(index)}>Add Step</Button>
            </Box>
        ))}
        <Button startIcon={<AddIcon />} onClick={handleAddSubGoal} sx={{ mt: 1 }}>Add Sub-goal</Button>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}

GoalEditor.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    goal: PropTypes.object
};
