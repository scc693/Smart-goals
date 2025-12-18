import React from 'react';
import PropTypes from 'prop-types';
import {
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, Typography, Box
} from '@mui/material';

export default function Leaderboard({ users }) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="leaderboard table">
        <TableHead>
          <TableRow>
            <TableCell>Rank</TableCell>
            <TableCell>User</TableCell>
            <TableCell align="right">Points</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user, index) => (
            <TableRow
              key={user.id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {index + 1}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}>
                        {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                    </Avatar>
                    {user.displayName || 'Anonymous'}
                </Box>
              </TableCell>
              <TableCell align="right">{user.currentPoints || 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

Leaderboard.propTypes = {
    users: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        displayName: PropTypes.string,
        currentPoints: PropTypes.number
    })).isRequired
};
