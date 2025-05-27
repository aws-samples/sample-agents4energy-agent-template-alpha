import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid2 as Grid, 
  Chip, 
  Box 
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import { Message } from '@/../utils/types';

// Updated interface to match permeability tool response
interface ReservoirAnalysisData {
  permeability_md: string;
  rock_type: string;
  porosity: number;
  assessment: string;
  __typename?: string;
}

interface PermeabilityToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const PermeabilityToolComponent: React.FC<PermeabilityToolComponentProps> = ({ content, theme }) => {
  try {
    // Parse the JSON content from the message
    const reservoirData: ReservoirAnalysisData = JSON.parse(content?.text || '{}');

    return (
      <Card 
        variant="outlined" 
        sx={{ 
          maxWidth: 400, 
          margin: 'auto', 
          backgroundColor: theme.palette.background.paper 
        }}
      >
        <CardContent>
          <Typography 
            variant="h6" 
            color="primary" 
            gutterBottom
          >
            Reservoir Permeability Analysis
          </Typography>
          
          <Grid container spacing={2}>
            <Grid>
              <Typography variant="subtitle2" color="textSecondary">
                Permeability
              </Typography>
              <Typography variant="body1">
                {reservoirData.permeability_md} mD
              </Typography>
            </Grid>
            
            <Grid>
              <Typography variant="subtitle2" color="textSecondary">
                Rock Type
              </Typography>
              <Typography variant="body1">
                {reservoirData.rock_type}
              </Typography>
            </Grid>
            
            <Grid>
              <Typography variant="subtitle2" color="textSecondary">
                Porosity
              </Typography>
              <Typography variant="body1">
                {(reservoirData.porosity * 100).toFixed(1)}%
              </Typography>
            </Grid>
            
            <Grid>
              <Chip 
                label={reservoirData.assessment} 
                color={
                  reservoirData.assessment.toLowerCase().includes('poor') 
                    ? 'error' 
                    : reservoirData.assessment.toLowerCase().includes('good') 
                    ? 'success' 
                    : 'default'
                }
                sx={{ width: '100%', justifyContent: 'center' }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  } catch (error) {
    return (
      <Box sx={{ color: 'error.main', p: 2 }}>
        <Typography variant="body2">
          Error parsing permeability data: {error instanceof Error ? error.message : 'Unknown error'}
        </Typography>
      </Box>
    );
  }
};

export default PermeabilityToolComponent;
