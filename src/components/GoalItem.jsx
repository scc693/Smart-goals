import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, LinearProgress, Box, Chip } from '@mui/material';

function LinearProgressWithLabel(props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(
          props.value,
        )}%`}</Typography>
      </Box>
    </Box>
  );
}

LinearProgressWithLabel.propTypes = {
    value: PropTypes.number.isRequired
};

export default function GoalItem({ goal, onClick }) {
  // Determine color based on progress
  const getColor = (p) => {
      if (p >= 100) return 'success';
      if (p > 50) return 'primary';
      return 'secondary';
  };

  return (
    <Card
        sx={{ mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
        onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="h6" component="div">
            {goal.title}
            </Typography>
            {goal.deadline && (
                 <Chip label={new Date(goal.deadline.seconds * 1000).toLocaleDateString()} size="small" variant="outlined" />
            )}
        </Box>

        <Typography sx={{ mb: 1.5 }} color="text.secondary">
            {goal.description}
        </Typography>

        {goal.reward && (
            <Typography variant="body2" sx={{ mb: 1, color: 'secondary.main', fontWeight: 'bold' }}>
                🏆 Reward: {goal.reward}
            </Typography>
        )}

        <LinearProgressWithLabel value={goal.progress || 0} color={getColor(goal.progress)} />

        {goal.lastModifiedBy && (
            <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                Last updated: {new Date(goal.lastModifiedAt?.seconds * 1000).toLocaleString()}
            </Typography>
        )}
      </CardContent>
    </Card>
  );
}

GoalItem.propTypes = {
    goal: PropTypes.shape({
        title: PropTypes.string.isRequired,
        description: PropTypes.string,
        progress: PropTypes.number,
        deadline: PropTypes.object,
        lastModifiedBy: PropTypes.string,
        lastModifiedAt: PropTypes.object,
        reward: PropTypes.string
    }).isRequired,
    onClick: PropTypes.func
};
