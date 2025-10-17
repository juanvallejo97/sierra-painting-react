#!/usr/bin/env bash

# Firestore Rules Coverage Checker
# Analyzes test coverage for security rules

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Firestore Security Rules Coverage Analysis${NC}\n"

# Count rule lines (excluding comments and empty lines)
RULES_FILE="firestore.rules"
TOTAL_RULES=$(grep -v "^\s*\/\/" "$RULES_FILE" | grep -v "^\s*$" | grep -E "(allow|function)" | wc -l)

echo -e "${BLUE}📋 Rules Analysis:${NC}"
echo "   Total rule statements: $TOTAL_RULES"

# Count allow statements by type
READ_RULES=$(grep "allow read:" "$RULES_FILE" | wc -l)
CREATE_RULES=$(grep "allow create:" "$RULES_FILE" | wc -l)
UPDATE_RULES=$(grep "allow update:" "$RULES_FILE" | wc -l)
DELETE_RULES=$(grep "allow delete:" "$RULES_FILE" | wc -l)
FUNCTIONS=$(grep "function " "$RULES_FILE" | wc -l)

echo "   - Read rules: $READ_RULES"
echo "   - Create rules: $CREATE_RULES"
echo "   - Update rules: $UPDATE_RULES"
echo "   - Delete rules: $DELETE_RULES"
echo "   - Helper functions: $FUNCTIONS"

# Count collections
COLLECTIONS=$(grep -E "match \/[a-zA-Z]+\/\{" "$RULES_FILE" | wc -l)
echo "   - Collections protected: $COLLECTIONS"

echo ""

# Run tests and capture output
echo -e "${BLUE}🧪 Running Rules Tests...${NC}"

if npm run test:rules > /tmp/rules-test-output.txt 2>&1; then
  echo -e "${GREEN}✓${NC} All rules tests passed"
else
  echo -e "${RED}✗${NC} Some tests failed"
  cat /tmp/rules-test-output.txt
  exit 1
fi

# Count test cases
TEST_FILE="src/__tests__/firestore-rules.test.ts"
if [ -f "$TEST_FILE" ]; then
  TOTAL_TESTS=$(grep -c "it('should" "$TEST_FILE" || echo "0")
  echo ""
  echo -e "${BLUE}📊 Test Coverage:${NC}"
  echo "   Total test cases: $TOTAL_TESTS"

  # Count tests by type
  READ_TESTS=$(grep -c "should.*read" "$TEST_FILE" || echo "0")
  CREATE_TESTS=$(grep -c "should.*create" "$TEST_FILE" || echo "0")
  UPDATE_TESTS=$(grep -c "should.*update" "$TEST_FILE" || echo "0")
  DELETE_TESTS=$(grep -c "should.*delete" "$TEST_FILE" || echo "0")
  DENY_TESTS=$(grep -c "should deny" "$TEST_FILE" || echo "0")
  ALLOW_TESTS=$(grep -c "should allow" "$TEST_FILE" || echo "0")

  echo "   - Read operation tests: $READ_TESTS"
  echo "   - Create operation tests: $CREATE_TESTS"
  echo "   - Update operation tests: $UPDATE_TESTS"
  echo "   - Delete operation tests: $DELETE_TESTS"
  echo "   - Allow tests (success): $ALLOW_TESTS"
  echo "   - Deny tests (security): $DENY_TESTS"

  # Calculate coverage
  OPERATION_RULES=$((READ_RULES + CREATE_RULES + UPDATE_RULES + DELETE_RULES))
  OPERATION_TESTS=$((READ_TESTS + CREATE_TESTS + UPDATE_TESTS + DELETE_TESTS))

  if [ $OPERATION_RULES -gt 0 ]; then
    COVERAGE=$((OPERATION_TESTS * 100 / OPERATION_RULES))
  else
    COVERAGE=0
  fi

  echo ""
  echo -e "${BLUE}📈 Coverage Metrics:${NC}"
  echo "   Rules: $OPERATION_RULES"
  echo "   Tests: $OPERATION_TESTS"
  echo "   Coverage: ${COVERAGE}%"

  # Coverage assessment
  if [ $COVERAGE -ge 90 ]; then
    echo -e "   ${GREEN}✓ Excellent coverage! (≥90%)${NC}"
    STATUS=0
  elif [ $COVERAGE -ge 70 ]; then
    echo -e "   ${YELLOW}⚠ Good coverage, but aim for 90% (currently $COVERAGE%)${NC}"
    STATUS=1
  else
    echo -e "   ${RED}✗ Coverage too low! Need 90% (currently $COVERAGE%)${NC}"
    STATUS=1
  fi

  # Check for multi-tenant isolation
  ISOLATION_TESTS=$(grep -c "company" "$TEST_FILE" | grep -c "isolat" || echo "0")
  CROSS_COMPANY_TESTS=$(grep -c "different company\|cross-company" "$TEST_FILE" || echo "0")

  echo ""
  echo -e "${BLUE}🔒 Security Coverage:${NC}"
  echo "   Multi-tenant isolation tests: $CROSS_COMPANY_TESTS"

  if [ $CROSS_COMPANY_TESTS -ge 5 ]; then
    echo -e "   ${GREEN}✓ Strong multi-tenant security testing${NC}"
  else
    echo -e "   ${YELLOW}⚠ Add more cross-company isolation tests${NC}"
  fi

  # Check for role-based tests
  ROLE_TESTS=$(grep -c "admin\|manager\|worker" "$TEST_FILE" || echo "0")
  echo "   Role-based access tests: $ROLE_TESTS"

  if [ $ROLE_TESTS -ge 10 ]; then
    echo -e "   ${GREEN}✓ Strong RBAC testing${NC}"
  else
    echo -e "   ${YELLOW}⚠ Add more role-based access tests${NC}"
  fi

  echo ""
  echo -e "${BLUE}📝 Recommendations:${NC}"

  if [ $COVERAGE -lt 90 ]; then
    echo "   • Add more tests to reach 90% coverage target"
  fi

  if [ $CROSS_COMPANY_TESTS -lt 5 ]; then
    echo "   • Add tests for cross-company data access attempts"
  fi

  if [ $DENY_TESTS -lt $ALLOW_TESTS ]; then
    echo "   • Balance allow/deny tests - security testing is crucial"
  fi

  # Check for untested collections
  echo ""
  echo -e "${BLUE}📚 Collection Coverage:${NC}"

  for collection in "users" "jobs" "invoices" "estimates" "companies" "timeEntries"; do
    COUNT=$(grep -c "collection('$collection')" "$TEST_FILE" || echo "0")
    if [ $COUNT -gt 0 ]; then
      echo -e "   ${GREEN}✓${NC} $collection: $COUNT tests"
    else
      echo -e "   ${YELLOW}⚠${NC} $collection: No tests found"
    fi
  done

  echo ""
  exit $STATUS
else
  echo -e "${RED}✗${NC} Test file not found: $TEST_FILE"
  exit 1
fi
