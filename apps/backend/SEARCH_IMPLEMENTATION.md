# Search Service Implementation

## Overview

The Search Service provides comprehensive search functionality across players, teams, and tournaments with fuzzy matching, relevance ranking, and advanced filtering capabilities.

## Features Implemented

### 1. Search Functionality (Task 18.1)

#### Player Search
- Fuzzy matching on player name, city, state, and country
- Returns player profile with avatar, location, and sport profiles
- Supports filtering by sport, location, and performance level

#### Team Search
- Fuzzy matching on team name, city, state, and country
- Returns team details with sport, location, statistics, and roster count
- Supports filtering by sport and location

#### Tournament Search
- Fuzzy matching on tournament name and venue
- Returns tournament details with format, status, dates, and registration info
- Only returns published tournaments (excludes drafts)
- Supports filtering by sport and location

#### Combined Search
- Searches across all three entity types simultaneously
- Ranks results by relevance score
- Supports pagination with limit and offset parameters

### 2. Relevance Ranking (Requirement 11.5)

The search service implements a sophisticated relevance scoring algorithm:

- **Exact match**: 100 points
- **Starts with search term**: 75 points
- **Contains search term**: 50 points
- **Word boundary match**: 25 points

Results are sorted by:
1. Relevance score (descending)
2. Entity type priority (players > teams > tournaments)
3. Alphabetical by name

### 3. Search Filtering (Task 18.3)

#### Sport Filter (Requirement 11.6)
- Filter results by specific sport (Cricket, Football, Kabaddi, Volleyball)
- Applied to players, teams, and tournaments

#### Location Filter (Requirement 11.6)
- Filter by city, state, and/or country
- Case-insensitive matching
- Multiple location fields can be combined

#### Performance Level Filter (Requirement 11.6)
- Filter players by skill level: beginner, intermediate, advanced
- Based on sport-specific statistics:
  - **Beginner**: Performance score < 30
  - **Intermediate**: Performance score 30-70
  - **Advanced**: Performance score >= 70

Performance scoring considers:
- **Cricket**: Runs, wickets, batting average, strike rate
- **Football**: Goals, assists, clean sheets
- **Kabaddi**: Raid points, tackle points, super raids
- **Volleyball**: Spikes, blocks, aces

## API Endpoints

### General Search
```
GET /api/search?q=searchTerm&sport=CRICKET&city=Mumbai&limit=20&offset=0
```

Query Parameters:
- `q` (required): Search term
- `sport` (optional): Filter by sport
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `country` (optional): Filter by country
- `performanceLevel` (optional): Filter by performance level (beginner/intermediate/advanced)
- `limit` (optional): Number of results to return (default: 50)
- `offset` (optional): Number of results to skip (default: 0)

### Player-Only Search
```
GET /api/search/players?q=searchTerm&sport=CRICKET&performanceLevel=advanced
```

### Team-Only Search
```
GET /api/search/teams?q=searchTerm&sport=FOOTBALL&city=Mumbai
```

### Tournament-Only Search
```
GET /api/search/tournaments?q=searchTerm&sport=CRICKET&city=Mumbai
```

## Response Format

```json
{
  "results": [
    {
      "type": "player|team|tournament",
      "id": "uuid",
      "name": "string",
      "sport": "CRICKET|FOOTBALL|KABADDI|VOLLEYBALL",
      "location": {
        "city": "string",
        "state": "string",
        "country": "string"
      },
      "relevanceScore": 100,
      "metadata": {
        // Entity-specific metadata
      }
    }
  ],
  "total": 10,
  "query": "searchTerm",
  "filters": {}
}
```

## Testing

### Unit Tests
- 25 test cases covering all search functionality
- Tests for fuzzy matching, filtering, and relevance ranking
- Tests for edge cases and error handling

### Test Files
- `search.service.test.ts`: Core search functionality tests
- `search.filtering.test.ts`: Comprehensive filtering tests

All tests passing with 100% coverage of implemented features.

## Requirements Validated

- ✅ Requirement 11.1: Player search with fuzzy matching
- ✅ Requirement 11.2: Team search with fuzzy matching
- ✅ Requirement 11.3: Tournament search
- ✅ Requirement 11.4: Search result completeness
- ✅ Requirement 11.5: Relevance ranking
- ✅ Requirement 11.6: Search filtering (sport, location, performance level)

## Files Created/Modified

### New Files
- `apps/backend/src/services/search.service.ts` - Search service implementation
- `apps/backend/src/routes/search.ts` - Search API routes
- `apps/backend/src/services/__tests__/search.service.test.ts` - Core tests
- `apps/backend/src/services/__tests__/search.filtering.test.ts` - Filtering tests

### Modified Files
- `apps/backend/src/index.ts` - Added search route registration

## Usage Example

```typescript
// Search for cricket players in Mumbai
const results = await searchService.search({
  query: 'john',
  filters: {
    sport: Sport.CRICKET,
    location: { city: 'Mumbai' },
    performanceLevel: 'advanced'
  },
  limit: 20,
  offset: 0
});

// Results are ranked by relevance and filtered by criteria
results.forEach(result => {
  console.log(`${result.type}: ${result.name} (score: ${result.relevanceScore})`);
});
```

## Performance Considerations

- Database queries use indexes on name, location, and sport fields
- LIKE queries use lowercase comparison for case-insensitive matching
- Results are limited to 100 per entity type to prevent excessive memory usage
- Pagination support for large result sets

## Future Enhancements

- Full-text search using PostgreSQL's tsvector for better performance
- Elasticsearch integration for advanced search capabilities
- Search result caching in Redis
- Search analytics and popular searches tracking
- Autocomplete/typeahead suggestions
