# Agent Configuration Summary

## Knowledge Base Priority Implementation

The agent has been configured with the following mandatory behaviors for geological, geophysical, and petrophysical queries:

### 1. Knowledge Base First Policy

**Implementation Location**: `/amplify/functions/reActAgent/handler.ts`

- **Auto-Query Mechanism**: The agent automatically queries the knowledge base for every user message
- **Geological Topic Detection**: Uses keyword matching to identify geological/geophysical/petrophysical queries
- **Priority Enforcement**: Knowledge base results are explicitly marked and prioritized in the system message

**Keywords Monitored**:
- geological, geology, geophysical, geophysics, petrophysical, petrophysics
- formation, rock, reservoir, seismic, well log, porosity, permeability
- saturation, lithology, facies, stratigraphy, structural, sedimentary
- carbonate, sandstone, shale, mudstone, limestone, dolomite

### 2. Fallback Behavior

- **If Knowledge Base Has Information**: Agent MUST use only that information
- **If Knowledge Base Has No Information**: Agent is explicitly told it may use other sources
- **Never Skip Knowledge Base**: For geological topics, knowledge base is always queried first

### 3. System Message Rules

The system message now includes:

```
### MANDATORY RULES:
1. **ALWAYS query knowledge base FIRST** for geological, geophysical, and petrophysical questions
2. **ONLY use other sources** if knowledge base returns no relevant information
3. **NEVER provide answers from general LLM knowledge** without first checking knowledge base
4. **NEVER create synthetic data** for plots or graphs unless explicitly requested by user
```

## Synthetic Data Prevention

### 1. Visualization Guidelines

**Implementation Location**: System message in `/amplify/functions/reActAgent/handler.ts`

- **No Synthetic Data**: Agent is prohibited from creating fake/synthetic data for plots
- **Data Validation**: Must verify data exists before creating visualizations
- **User Notification**: If data is missing, agent must inform user about unavailability
- **Explicit Permission**: Only create synthetic data when explicitly requested by user

### 2. Enhanced Rules

```
### Data and Plotting Rules:
- **NEVER create synthetic/fake data** for plots or visualizations
- **IF required data doesn't exist**: Inform user about data unavailability
- **ONLY create synthetic data** when explicitly requested by user
- **ALWAYS use real data** from available sources when creating plots
```

## Technical Implementation Details

### 1. Auto-Query Enhancement

```typescript
// Enhanced geological topic detection
const geologicalKeywords = [/* comprehensive keyword list */];
const isGeologicalQuery = geologicalKeywords.some(keyword => 
    messageContent.toLowerCase().includes(keyword.toLowerCase())
);

// Explicit knowledge base result handling
if (isGeologicalQuery && kbContext.includes("No relevant information")) {
    kbContext = `KNOWLEDGE BASE QUERY RESULT: No relevant information found for geological/geophysical/petrophysical query: "${messageContent}". You may now use other sources as fallback.`;
} else if (isGeologicalQuery) {
    kbContext = `KNOWLEDGE BASE QUERY RESULT (USE THIS FIRST): ${kbContext}`;
}
```

### 2. Knowledge Base Context Injection

The knowledge base results are now injected directly into the system message:

```typescript
${kbContext ? `\n## CURRENT KNOWLEDGE BASE CONTEXT:\n${kbContext}\n` : ''}
```

### 3. Tool Priority

- **Knowledge Base Tool**: First in the tools array
- **DuckDuckGo Search**: Commented out to prevent bypassing knowledge base
- **Other Tools**: Available as fallback options

## Validation Tools

### 1. Knowledge Base Priority Enforcer

**File**: `/amplify/functions/tools/knowledgeBasePriorityWrapper.ts`

- Provides utility functions for geological topic detection
- Enforces knowledge base priority programmatically
- Validates data requirements for plotting operations

### 2. Data Validation

```typescript
export function validateDataRequirement(operation: string, dataAvailable: boolean): string {
    if (!dataAvailable && (operation.includes('plot') || operation.includes('graph') || operation.includes('chart'))) {
        return "ERROR: Cannot create plots without real data. Synthetic data creation is prohibited unless explicitly requested by user.";
    }
    return "";
}
```

## Testing the Configuration

To verify the configuration works:

1. **Test Knowledge Base Priority**:
   - Ask a geological question
   - Verify knowledge base is queried first
   - Check that fallback only occurs when KB has no information

2. **Test Synthetic Data Prevention**:
   - Request a plot without providing data
   - Verify agent refuses to create synthetic data
   - Confirm agent suggests data sources or asks for explicit permission

3. **Test Fallback Behavior**:
   - Ask about a geological topic not in knowledge base
   - Verify agent acknowledges KB was checked first
   - Confirm agent then uses other sources appropriately

## Deployment

After making these changes:

1. Deploy the updated agent:
   ```bash
   npx ampx sandbox --stream-function-logs
   ```

2. Test the new behavior in the UI
3. Monitor logs to ensure knowledge base queries are happening as expected

## Configuration Files Modified

1. `/amplify/functions/reActAgent/handler.ts` - Main agent logic and system message
2. `/amplify/functions/tools/knowledgeBasePriorityWrapper.ts` - New validation utilities
3. `/AGENT_CONFIGURATION.md` - This documentation file
