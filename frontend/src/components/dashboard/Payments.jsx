import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiRefreshCw,
} from "react-icons/fi";
import PageHeader from "./PageHeader";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");
const REFRESH_INTERVAL_MS = 30_000;
const getPreviousClosedMonth = () => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
};

const formatMoney = (cents, currency = "zar") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: String(currency || "zar").toUpperCase(),
  }).format(Number(cents || 0) / 100);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const getInvoiceBadge = (status) => {
  if (status === "paid") return { colorScheme: "green", label: "Paid" };
  if (status === "failed") return { colorScheme: "red", label: "Payment failed" };
  if (status === "void") return { colorScheme: "gray", label: "Void" };
  return { colorScheme: "orange", label: status || "Open" };
};

const getSubscriptionBadge = (status) => {
  if (status === "active") return { colorScheme: "green", label: "Active" };
  if (status === "past_due") return { colorScheme: "orange", label: "Past due" };
  if (status === "expired") return { colorScheme: "red", label: "Expired" };
  if (status === "canceled") return { colorScheme: "gray", label: "Canceled" };
  if (status === "pending" || status === "pending_payment") {
    return { colorScheme: "orange", label: "Pending payment" };
  }
  if (status === "approval_pending") {
    return { colorScheme: "purple", label: "Awaiting admin approval" };
  }
  if (status === "rejected") return { colorScheme: "red", label: "Not approved" };
  if (status === "free_trial") return { colorScheme: "blue", label: "Free trial" };
  if (status === "trial_ended") return { colorScheme: "red", label: "Trial ended" };
  return { colorScheme: "gray", label: "No subscription" };
};

const formatPlan = (slug) =>
  slug ? `${slug.charAt(0).toUpperCase()}${slug.slice(1)}` : "—";

const getTrialRemainingDuration = (endsAt) => {
  const end = new Date(endsAt);
  const now = new Date();
  if (Number.isNaN(end.getTime()) || end <= now) {
    return { months: 0, days: 0 };
  }

  let months = 0;
  while (months < 3) {
    const nextMonth = new Date(now);
    const dayOfMonth = nextMonth.getUTCDate();
    nextMonth.setUTCDate(1);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + months + 1);
    const lastDayOfMonth = new Date(
      Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0),
    ).getUTCDate();
    nextMonth.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
    if (nextMonth > end) break;
    months += 1;
  }

  const monthAnchor = new Date(now);
  const dayOfMonth = monthAnchor.getUTCDate();
  monthAnchor.setUTCDate(1);
  monthAnchor.setUTCMonth(monthAnchor.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + 1, 0),
  ).getUTCDate();
  monthAnchor.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
  return {
    months,
    days: Math.max(
      0,
      Math.ceil((end.getTime() - monthAnchor.getTime()) / 86400000),
    ),
  };
};

const getTrialRemainingLabel = (trial) => {
  if (trial?.status !== "active" || !trial.ends_at) return "";
  const { months, days } = getTrialRemainingDuration(trial.ends_at);
  const duration = [
    months ? `${months} month${months === 1 ? "" : "s"}` : "",
    days ? `${days} day${days === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" and ");
  const totalDays = Number(trial.days_remaining) || 0;
  return `${duration || "Less than a day"} remaining (${totalDays} day${totalDays === 1 ? "" : "s"} total)`;
};

const getSchoolBillingStatus = ({ school, subscription, latest_invoice: invoice, trial }) => {
  if (trial?.status === "pending_approval") return "approval_pending";
  if (trial?.status === "rejected") return "rejected";
  if (school?.status && school.status !== "approved") {
    return school.status === "rejected" ? "rejected" : "approval_pending";
  }
  if (
    subscription?.billing_status === "pending" ||
    invoice?.status === "awaiting_payment"
  ) {
    return "pending_payment";
  }
  if (subscription?.billing_status) return subscription.billing_status;
  if (trial?.status === "active") return "free_trial";
  if (trial?.status === "expired") return "trial_ended";
  return "not_subscribed";
};

const Payments = () => {
  const [adminRole] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")
        ?.admin_profile?.admin_role;
    } catch (error) {
      console.warn("Could not read the current platform admin role:", error);
      return null;
    }
  });
  const isSuperAdmin = adminRole === "super_admin";
  const [report, setReport] = useState(null);
  const [search, setSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolSubscriptions, setSchoolSubscriptions] = useState([]);
  const [schoolSubscriptionsError, setSchoolSubscriptionsError] = useState("");
  const [pendingSchoolInvoices, setPendingSchoolInvoices] = useState([]);
  const [schoolInvoicesError, setSchoolInvoicesError] = useState("");
  const [canConfirmSchoolEft, setCanConfirmSchoolEft] = useState(false);
  const [confirmingSchoolInvoice, setConfirmingSchoolInvoice] = useState("");
  const [schoolInvoiceNotice, setSchoolInvoiceNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [payoutPeriod, setPayoutPeriod] = useState(getPreviousClosedMonth);
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutsError, setPayoutsError] = useState("");
  const [payoutNotice, setPayoutNotice] = useState("");
  const [payoutActionId, setPayoutActionId] = useState("");
  const [payoutAdjustments, setPayoutAdjustments] = useState({});
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [transferDetails, setTransferDetails] = useState({
    bank_name: "",
    account_last4: "",
    transfer_reference: "",
  });
  const {
    isOpen: isPayoutModalOpen,
    onOpen: openPayoutModal,
    onClose: closePayoutModal,
  } = useDisclosure();

  const refreshOwnerPayouts = useCallback(
    async (background = false) => {
      if (!background) setPayoutsLoading(true);
      setPayoutsError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Your support session has expired. Please sign in again.");
        }
        const response = await fetch(
          `${API_URL}/admin/owner-payouts?period=${encodeURIComponent(payoutPeriod)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error || "Unable to load owner payouts.");
        }
        setPayouts(result?.payouts || []);
      } catch (requestError) {
        console.error("Could not load owner payouts:", requestError);
        setPayoutsError(
          requestError?.message || "Unable to load owner payouts.",
        );
      } finally {
        setPayoutsLoading(false);
      }
    },
    [payoutPeriod],
  );

  const refresh = useCallback(async (background = false) => {
    if (!background) setRefreshing(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Your support session has expired. Please sign in again.");
      }
      const response = await fetch(`${API_URL}/admin/commissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error === "PLATFORM_ADMIN_REQUIRED"
            ? "This account is not authorized to view commission finances."
            : result?.error || "Unable to load finance records.",
        );
      }
      setReport(result);
      await refreshOwnerPayouts(true);
      try {
        const subscriptionsResponse = await fetch(
          `${API_URL}/admin/school-billing/subscriptions`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const subscriptionsResult = await subscriptionsResponse.json();
        if (!subscriptionsResponse.ok) {
          throw new Error(
            subscriptionsResult?.error || "Unable to load school subscriptions.",
          );
        }
        setSchoolSubscriptions(subscriptionsResult?.subscriptions || []);
        setSchoolSubscriptionsError("");
      } catch (subscriptionsRequestError) {
        console.error("Could not load school subscriptions:", subscriptionsRequestError);
        setSchoolSubscriptionsError(
          subscriptionsRequestError?.message || "Unable to load school subscriptions.",
        );
      }
      try {
        const invoicesResponse = await fetch(
          `${API_URL}/admin/school-billing/invoices`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const invoicesResult = await invoicesResponse.json();
        if (!invoicesResponse.ok) {
          throw new Error(invoicesResult?.error || "Unable to load school EFT invoices.");
        }
        setPendingSchoolInvoices(invoicesResult?.invoices || []);
        setCanConfirmSchoolEft(Boolean(invoicesResult?.can_confirm_payments));
        setSchoolInvoicesError("");
      } catch (invoicesRequestError) {
        console.error("Could not load pending school EFT invoices:", invoicesRequestError);
        setSchoolInvoicesError(
          invoicesRequestError?.message || "Unable to load school EFT invoices.",
        );
      }
    } catch (requestError) {
      console.error("Could not load finance report:", requestError);
      setError(
        requestError?.message || "Unable to load finance records.",
      );
    } finally {
      setLoading(false);
      if (!background) setRefreshing(false);
    }
  }, [refreshOwnerPayouts]);

  const prepareOwnerPayout = async (payout) => {
    if (!isSuperAdmin || payoutActionId) return;
    const adjustment = Number(payoutAdjustments[payout.owner_id]?.amount || 0);
    const adjustmentCents = Math.round(adjustment * 100);
    const adjustmentNote =
      payoutAdjustments[payout.owner_id]?.note?.trim() || "";
    if (!Number.isFinite(adjustment) || adjustment < 0) {
      setPayoutsError("Enter a valid non-negative adjustment amount.");
      return;
    }
    if (adjustmentCents > 0 && adjustmentNote.length < 5) {
      setPayoutsError("Add a reason of at least 5 characters for the deduction.");
      return;
    }
    if (
      !window.confirm(
        `Prepare the ${payoutPeriod} payout snapshot for ${payout.owner_name}? Check the cleared card receipts and any refund/chargeback deductions first.`,
      )
    ) {
      return;
    }

    setPayoutActionId(payout.owner_id);
    setPayoutsError("");
    setPayoutNotice("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/admin/owner-payouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner_id: payout.owner_id,
          period_start: payoutPeriod,
          adjustments_cents: adjustmentCents,
          adjustment_note: adjustmentNote,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Unable to prepare this payout.");
      }
      setPayoutNotice(`Payout snapshot prepared for ${payout.owner_name}.`);
      await refreshOwnerPayouts(true);
    } catch (requestError) {
      console.error("Could not prepare owner payout:", requestError);
      setPayoutsError(
        requestError?.message || "Unable to prepare this payout.",
      );
    } finally {
      setPayoutActionId("");
    }
  };

  const markOwnerPayoutPaid = async () => {
    if (!isSuperAdmin || !selectedPayout || payoutActionId) return;
    setPayoutActionId(selectedPayout.payout_id);
    setPayoutsError("");
    setPayoutNotice("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/admin/owner-payouts/${selectedPayout.payout_id}/paid`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transferDetails),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Unable to record the transfer.");
      }
      setPayoutNotice(`Payout marked paid for ${selectedPayout.owner_name}.`);
      setSelectedPayout(null);
      setTransferDetails({
        bank_name: "",
        account_last4: "",
        transfer_reference: "",
      });
      closePayoutModal();
      await refreshOwnerPayouts(true);
    } catch (requestError) {
      console.error("Could not record owner payout:", requestError);
      setPayoutsError(
        requestError?.message || "Unable to record the transfer.",
      );
    } finally {
      setPayoutActionId("");
    }
  };

  const confirmSchoolEft = async (invoice) => {
    const schoolName = invoice.schools?.name || "this school";
    if (
      !window.confirm(
        `Confirm that ${formatMoney(invoice.amount_cents, invoice.currency)} has cleared in your bank account for ${schoolName} (${invoice.invoice_number})? Only confirm after checking the bank statement.`,
      )
    ) {
      return;
    }

    setConfirmingSchoolInvoice(invoice.id);
    setSchoolInvoiceNotice("");
    setSchoolInvoicesError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Your support session has expired. Please sign in again.");
      }
      const response = await fetch(
        `${API_URL}/admin/school-billing/invoices/${invoice.id}/mark-paid`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error === "SCHOOL_EFT_CONFIRMATION_REQUIRED"
            ? "Your role is not authorized to confirm school EFT payments."
            : result?.error || "Unable to confirm school EFT payment.",
        );
      }
      setSchoolInvoiceNotice(
        `EFT receipt confirmed for ${schoolName} (${invoice.invoice_number}).`,
      );
      await refresh(true);
    } catch (requestError) {
      console.error("Could not confirm school EFT payment:", requestError);
      setSchoolInvoicesError(
        requestError?.message || "Unable to confirm school EFT payment.",
      );
    } finally {
      setConfirmingSchoolInvoice("");
    }
  };

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const summary = report?.summary || {};
  const owners = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (report?.owners_owing || []).filter((owner) =>
      `${owner.owner_name || ""} ${owner.email || ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [report?.owners_owing, search]);
  const invoices = report?.invoices || [];
  const filteredSchoolSubscriptions = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    return schoolSubscriptions.filter(({ school, subscription, latest_invoice: invoice, trial }) =>
      `${school?.name || ""} ${school?.school_email || ""} ${
        subscription?.plan_slug || ""
      } ${subscription?.billing_interval || ""} ${
        subscription?.billing_provider || ""
      } ${getSchoolBillingStatus({ school, subscription, latest_invoice: invoice, trial })} ${
        getTrialRemainingLabel(trial)
      } ${invoice?.invoice_number || ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [schoolSearch, schoolSubscriptions]);

  const metrics = [
    {
      label: "Owner subscriptions unpaid",
      value: summary.owner_subscription_invoices_outstanding_cents,
      caption: `${summary.owner_subscription_overdue_count || 0} subscriptions overdue`,
      color: "red.500",
      icon: FiAlertCircle,
      scheme: "red",
    },
    {
      label: "Client fares outstanding",
      value: summary.client_fare_outstanding_cents,
      caption: `${formatMoney(summary.client_fare_overdue_cents)} overdue`,
      color: "orange.500",
      icon: FiClock,
      scheme: "orange",
    },
    {
      label: "Client service fees collected",
      value: summary.client_service_fees_collected_cents,
      caption: "R5 per child, paid by clients",
      color: "green.500",
      icon: FiCheckCircle,
      scheme: "green",
    },
    {
      label: "Legacy owner fees owing",
      value: summary.legacy_owner_fees_owing_cents ?? summary.owing_cents,
      caption: "Balances from the previous owner-billed policy",
      color: "blue.500",
      icon: FiDollarSign,
      scheme: "blue",
    },
  ];

  return (
    <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 6, xl: 8 }}>
      <PageHeader
        eyebrow="PLATFORM FINANCE"
        title="Payments & commissions"
        description="Track subscriptions, client fares, service fees and legacy owner balances."
        actions={
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            variant="outline"
            colorScheme="blue"
            onClick={() => void refresh()}
            isLoading={refreshing}
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Alert status="error" borderRadius="xl" mb={5}>
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading && !report ? (
        <Flex minH="240px" align="center" justify="center" direction="column" gap={3}>
          <Spinner color="blue.500" />
          <Text color="gray.600">Loading finance records…</Text>
        </Flex>
      ) : (
        <Tabs colorScheme="blue" variant="enclosed" isLazy defaultIndex={0}>
          <TabList overflowX="auto">
            <Tab whiteSpace="nowrap">
              School subscriptions
              <Badge ml={2} colorScheme="blue">{schoolSubscriptions.length}</Badge>
              {pendingSchoolInvoices.length > 0 ? (
                <Badge ml={1} colorScheme="orange">{pendingSchoolInvoices.length} EFT</Badge>
              ) : null}
            </Tab>
            <Tab whiteSpace="nowrap">Finance</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} pt={5}>
        <Stack spacing={6}>
          <Card borderRadius="2xl" border="1px solid" borderColor="gray.100">
            <CardBody>
              <Flex
                justify="space-between"
                align={{ base: "stretch", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={4}
                mb={4}
              >
                <Box>
                  <Heading size="md">School subscriptions</Heading>
                  <Text color="gray.500" fontSize="sm" mt={1}>
                    School plans, billing periods, payment methods, statuses, and latest invoices.
                  </Text>
                </Box>
                <Input
                  maxW={{ base: "100%", md: "320px" }}
                  value={schoolSearch}
                  onChange={(event) => setSchoolSearch(event.target.value)}
                  placeholder="Search school, plan, status..."
                  bg="white"
                  aria-label="Search school subscriptions"
                />
              </Flex>
              {schoolSubscriptionsError ? (
                <Alert status="error" borderRadius="xl" mb={4}>
                  <AlertIcon />
                  <AlertDescription>{schoolSubscriptionsError}</AlertDescription>
                </Alert>
              ) : null}
              {filteredSchoolSubscriptions.length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>School</Th>
                        <Th>Plan / period</Th>
                        <Th>Payment method</Th>
                        <Th>Status</Th>
                        <Th isNumeric>Price</Th>
                        <Th>Paid through</Th>
                        <Th>Latest invoice</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredSchoolSubscriptions.map(({ school, subscription, latest_invoice: invoice, trial }) => {
                        const status = getSchoolBillingStatus({
                          school,
                          subscription,
                          latest_invoice: invoice,
                          trial,
                        });
                        const badge = getSubscriptionBadge(status);
                        const trialLabel = getTrialRemainingLabel(trial);
                        const billingNote =
                          status === "approval_pending"
                            ? `School registration is awaiting admin approval (${school.status || "pending"}). The free-trial clock starts after approval.`
                            : status === "rejected"
                              ? "School registration was not approved."
                              : status === "pending_payment"
                            ? trial?.status === "expired"
                              ? `Trial ended ${formatDate(trial.ends_at)} · payment awaiting confirmation`
                              : trial?.status === "active"
                                ? `Payment awaiting confirmation · trial ${trialLabel}`
                                : invoice?.payment_reported_at
                                  ? "Payment reported · awaiting support confirmation"
                                  : "Invoice awaiting payment"
                              : status === "free_trial"
                                ? `${trialLabel} · ends ${formatDate(trial.ends_at)}`
                                : status === "trial_ended"
                                  ? `Ended ${formatDate(trial.ends_at)} · no paid subscription`
                                  : "";
                        return (
                          <Tr key={school.id}>
                            <Td>
                              <Text fontWeight="700" color="gray.800">
                                {school.name || "Unnamed school"}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {school.school_email || "No billing email"}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontWeight="600">{formatPlan(subscription?.plan_slug)}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {subscription?.billing_interval
                                  ? `${subscription.billing_interval} billing`
                                  : "—"}
                              </Text>
                            </Td>
                            <Td>
                              {subscription?.billing_provider === "paystack"
                                  ? "One-time · Paystack"
                                  : subscription?.billing_provider === "legacy"
                                    ? "Legacy card payment"
                                : subscription?.billing_provider === "bank_transfer"
                                  ? "Invoice · EFT"
                                  : "—"}
                            </Td>
                            <Td>
                              <Badge colorScheme={badge.colorScheme}>{badge.label}</Badge>
                              {billingNote ? (
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                  {billingNote}
                                </Text>
                              ) : null}
                              {subscription?.auto_renew ? (
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                  Auto-renew on
                                </Text>
                              ) : null}
                            </Td>
                            <Td isNumeric>
                              {subscription
                                ? formatMoney(subscription.price_cents, subscription.currency)
                                : "—"}
                            </Td>
                            <Td>{formatDate(subscription?.current_period_end)}</Td>
                            <Td>
                              {invoice ? (
                                <>
                                  <Text fontWeight="600">{invoice.invoice_number}</Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {getInvoiceBadge(invoice.status).label} ·{" "}
                                    {formatMoney(invoice.amount_cents, invoice.currency)}
                                  </Text>
                                </>
                              ) : (
                                "—"
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text py={6} color="gray.500" textAlign="center">
                  {schoolSearch
                    ? "No schools match your search."
                    : schoolSubscriptionsError
                      ? "School subscriptions could not be loaded."
                      : "No schools or subscriptions found."}
                </Text>
              )}
            </CardBody>
          </Card>

          <Card borderRadius="2xl" border="1px solid" borderColor="gray.100">
            <CardBody>
              <Box mb={4}>
                <Heading size="md">School EFT payments to verify</Heading>
                <Text color="gray.500" fontSize="sm" mt={1}>
                  Schools pay the configured business bank account using the invoice number as reference.
                  Verify the deposit in the bank account before confirming receipt.
                </Text>
              </Box>
              {schoolInvoiceNotice ? (
                <Alert status="success" borderRadius="xl" mb={4}>
                  <AlertIcon />
                  <AlertDescription>{schoolInvoiceNotice}</AlertDescription>
                </Alert>
              ) : null}
              {schoolInvoicesError ? (
                <Alert status="error" borderRadius="xl" mb={4}>
                  <AlertIcon />
                  <AlertDescription>{schoolInvoicesError}</AlertDescription>
                </Alert>
              ) : null}
              {pendingSchoolInvoices.length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>School / invoice</Th>
                        <Th>Plan / period</Th>
                        <Th>Payment report</Th>
                        <Th>Due</Th>
                        <Th isNumeric>Amount</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {pendingSchoolInvoices.map((invoice) => (
                        <Tr key={invoice.id}>
                          <Td>
                            <Text fontWeight="700" color="gray.800">
                              {invoice.schools?.name || "School"}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {invoice.invoice_number}
                              {invoice.schools?.school_email
                                ? ` · ${invoice.schools.school_email}`
                                : ""}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontWeight="600">{formatPlan(invoice.plan_slug)}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {invoice.billing_interval} billing · Invoice · EFT
                            </Text>
                          </Td>
                          <Td>
                            {invoice.payment_reported_at ? (
                              <>
                                <Badge colorScheme="blue">School reports paid</Badge>
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                  {formatDate(invoice.payment_reported_at)}
                                </Text>
                              </>
                            ) : (
                              <Badge colorScheme="orange">No payment report</Badge>
                            )}
                          </Td>
                          <Td>{formatDate(invoice.due_at)}</Td>
                          <Td isNumeric fontWeight="700">
                            {formatMoney(invoice.amount_cents, invoice.currency)}
                          </Td>
                          <Td>
                            {canConfirmSchoolEft ? (
                              <Button
                                size="sm"
                                colorScheme="green"
                                isLoading={confirmingSchoolInvoice === invoice.id}
                                isDisabled={Boolean(confirmingSchoolInvoice)}
                                onClick={() => void confirmSchoolEft(invoice)}
                              >
                                Confirm received
                              </Button>
                            ) : (
                              <Text fontSize="xs" color="gray.500">
                                Review only
                              </Text>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text py={6} color="gray.500" textAlign="center">
                  {schoolInvoicesError
                    ? "Pending school EFT invoices could not be loaded."
                    : "No pending school EFT invoices."}
                </Text>
              )}
            </CardBody>
          </Card>

        </Stack>
            </TabPanel>
            <TabPanel px={0} pt={5}>
        <Stack spacing={6}>
          <Card borderRadius="2xl" border="1px solid" borderColor="gray.100">
            <CardBody>
              <Flex
                justify="space-between"
                align={{ base: "stretch", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={4}
                mb={4}
              >
                <Box>
                  <Heading size="md">Monthly owner payouts</Heading>
                  <Text color="gray.500" fontSize="sm" mt={1}>
                    Review cleared Paystack transport fares, prepare a monthly
                    snapshot, then record the external bank transfer.
                  </Text>
                </Box>
                <Input
                  aria-label="Payout month"
                  type="month"
                  max={getPreviousClosedMonth()}
                  value={payoutPeriod}
                  onChange={(event) => setPayoutPeriod(event.target.value)}
                  maxW={{ base: "100%", md: "220px" }}
                  bg="white"
                />
              </Flex>
              <Alert status="info" borderRadius="xl" mb={4}>
                <AlertIcon />
                <AlertDescription>
                  Full bank details must be verified and used in the separate
                  finance process. This portal stores only the bank name,
                  account last four digits, and transfer reference.
                </AlertDescription>
              </Alert>
              {payoutNotice ? (
                <Alert status="success" borderRadius="xl" mb={4}>
                  <AlertIcon />
                  <AlertDescription>{payoutNotice}</AlertDescription>
                </Alert>
              ) : null}
              {payoutsError ? (
                <Alert status="error" borderRadius="xl" mb={4}>
                  <AlertIcon />
                  <AlertDescription>{payoutsError}</AlertDescription>
                </Alert>
              ) : null}
              {!isSuperAdmin ? (
                <Text color="gray.600" fontSize="sm" mb={4}>
                  Only an active super admin can prepare or record owner payouts.
                </Text>
              ) : null}
              {payoutsLoading ? (
                <Flex py={8} justify="center">
                  <Spinner color="blue.500" />
                </Flex>
              ) : payouts.length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Fleet owner</Th>
                        <Th isNumeric>Transport fare receipts</Th>
                        <Th isNumeric>Client-paid service fees</Th>
                        <Th>Documented deductions</Th>
                        <Th isNumeric>Net payout</Th>
                        <Th>Status</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {payouts.map((payout) => {
                        const adjustment =
                          payoutAdjustments[payout.owner_id] || {};
                        const adjustmentAmount = Number(adjustment.amount || 0);
                        const adjustmentCents = Number.isFinite(adjustmentAmount)
                          ? Math.round(adjustmentAmount * 100)
                          : 0;
                        const isPending = payout.payout_status === "pending";
                        const isPaid = payout.payout_status === "paid";
                        return (
                          <Tr key={payout.owner_id}>
                            <Td>
                              <Text fontWeight="700">{payout.owner_name}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {payout.owner_email || "No billing email"}
                              </Text>
                            </Td>
                            <Td isNumeric>
                              {formatMoney(payout.gross_fare_receipts_cents)}
                            </Td>
                            <Td isNumeric>
                              {formatMoney(payout.client_service_fees_cents)}
                            </Td>
                            <Td minW="220px">
                              {payout.payout_id ? (
                                <Box>
                                  <Text>
                                    {formatMoney(payout.adjustments_cents)}
                                  </Text>
                                  {payout.adjustment_note ? (
                                    <Text fontSize="xs" color="gray.500">
                                      {payout.adjustment_note}
                                    </Text>
                                  ) : null}
                                </Box>
                              ) : (
                                <Stack spacing={2}>
                                  <Input
                                    aria-label={`Adjustment amount for ${payout.owner_name}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    size="sm"
                                    placeholder="Refund / chargeback / prior transfer / processing fee"
                                    value={adjustment.amount || ""}
                                    onChange={(event) =>
                                      setPayoutAdjustments((current) => ({
                                        ...current,
                                        [payout.owner_id]: {
                                          ...current[payout.owner_id],
                                          amount: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <Input
                                    aria-label={`Adjustment reason for ${payout.owner_name}`}
                                    size="sm"
                                    placeholder="Reason / refund reference"
                                    value={adjustment.note || ""}
                                    onChange={(event) =>
                                      setPayoutAdjustments((current) => ({
                                        ...current,
                                        [payout.owner_id]: {
                                          ...current[payout.owner_id],
                                          note: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </Stack>
                              )}
                            </Td>
                            <Td isNumeric fontWeight="700">
                              {formatMoney(
                                payout.payout_id
                                  ? payout.net_payout_cents
                                  : payout.net_payout_cents - adjustmentCents,
                              )}
                            </Td>
                            <Td>
                              <Badge
                                colorScheme={
                                  isPaid
                                    ? "green"
                                    : isPending
                                      ? "orange"
                                      : "blue"
                                }
                              >
                                {isPaid
                                  ? "Paid"
                                  : isPending
                                    ? "Transfer pending"
                                    : "Not prepared"}
                              </Badge>
                              {payout.destination_label ? (
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                  {payout.destination_label}
                                </Text>
                              ) : null}
                            </Td>
                            <Td>
                              {!payout.payout_id ? (
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  isDisabled={!isSuperAdmin || Boolean(payoutActionId)}
                                  isLoading={payoutActionId === payout.owner_id}
                                  onClick={() => void prepareOwnerPayout(payout)}
                                >
                                  Prepare
                                </Button>
                              ) : isPending ? (
                                <Button
                                  size="sm"
                                  colorScheme="green"
                                  isDisabled={!isSuperAdmin || Boolean(payoutActionId)}
                                  onClick={() => {
                                    setSelectedPayout(payout);
                                    openPayoutModal();
                                  }}
                                >
                                  Record transfer
                                </Button>
                              ) : (
                                <Text fontSize="sm" color="gray.500">
                                  {payout.transfer_reference || "Complete"}
                                </Text>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500" py={5} textAlign="center">
                  {payoutsError
                    ? "Owner payout preview could not be loaded."
                    : "No cleared Paystack card receipts for this month."}
                </Text>
              )}
              <Text color="gray.500" fontSize="xs" mt={4}>
                Net payout is transport fare receipts less documented refunds,
                chargebacks, prior transfers, and any manually entered
                processing-fee deduction. Client-paid service fees are shown
                separately and are not deducted from owner fares.
                Transfers are not initiated from this portal.
              </Text>
            </CardBody>
          </Card>

          <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4}>
            {metrics.map((metric) => (
              <Card key={metric.label} borderRadius="2xl" border="1px solid" borderColor="gray.100">
                <CardBody>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <Text color="gray.500" fontSize="sm" fontWeight="600">
                        {metric.label}
                      </Text>
                      <Heading size="md" color={metric.color}>
                        {formatMoney(metric.value)}
                      </Heading>
                      <Text color="gray.500" fontSize="xs">
                        {metric.caption}
                      </Text>
                    </VStack>
                    <Flex
                      w={10}
                      h={10}
                      align="center"
                      justify="center"
                      borderRadius="xl"
                      bg={`${metric.scheme}.50`}
                      color={metric.color}
                    >
                      <Icon as={metric.icon} boxSize={5} />
                    </Flex>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          <Card borderRadius="2xl" border="1px solid" borderColor="gray.100">
            <CardBody>
              <Heading size="md" mb={4}>Owner subscriptions</Heading>
              {(report?.subscriptions || []).length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Fleet owner</Th>
                        <Th>Plan</Th>
                        <Th>Provider</Th>
                        <Th>Status</Th>
                        <Th>Period ends</Th>
                        <Th isNumeric>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {report.subscriptions.map((subscription) => (
                        <Tr key={subscription.id}>
                          <Td>
                            <Text fontWeight="700">{subscription.owner_name}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {subscription.owner_email || "No billing email"}
                            </Text>
                          </Td>
                          <Td>{subscription.plan_name} · {subscription.billing_interval}</Td>
                          <Td>
                            {subscription.payment_provider === "paystack"
                              ? "One-time · Paystack"
                              : "Legacy card payment"}
                          </Td>
                          <Td>
                            <Badge colorScheme={subscription.overdue ? "red" : getSubscriptionBadge(subscription.status).colorScheme}>
                              {subscription.overdue ? "Overdue" : getSubscriptionBadge(subscription.status).label}
                            </Badge>
                          </Td>
                          <Td>{formatDate(subscription.current_period_end)}</Td>
                          <Td isNumeric>{formatMoney(subscription.amount_cents, subscription.currency)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500">No owner subscriptions found.</Text>
              )}
              <Heading size="sm" mt={6} mb={3}>Subscription invoices</Heading>
              {(report?.subscription_invoices || []).length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Fleet owner</Th>
                        <Th>Period</Th>
                        <Th>Due date</Th>
                        <Th>Status</Th>
                        <Th isNumeric>Amount due</Th>
                        <Th>Invoice</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {report.subscription_invoices.map((invoice) => (
                        <Tr key={invoice.id || invoice.period_start}>
                          <Td>{invoice.owner_name}</Td>
                          <Td>{formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}</Td>
                          <Td>{formatDate(invoice.due_at)}</Td>
                          <Td>
                            <Badge colorScheme={invoice.overdue ? "red" : getInvoiceBadge(invoice.status).colorScheme}>
                              {invoice.overdue ? "Overdue" : getInvoiceBadge(invoice.status).label}
                            </Badge>
                          </Td>
                          <Td isNumeric>{formatMoney(invoice.amount_due_cents, invoice.currency)}</Td>
                          <Td>—</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500" fontSize="sm">
                  Invoice records appear when a billing period is processed.
                </Text>
              )}
            </CardBody>
          </Card>

          <Card borderRadius="2xl" border="1px solid" borderColor="gray.100">
            <CardBody>
              <Heading size="md" mb={4}>Client transport fares</Heading>
              {(report?.client_fares || []).length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Client</Th>
                        <Th>Fleet owner</Th>
                        <Th>Method</Th>
                        <Th>Provider</Th>
                        <Th>Due date</Th>
                        <Th>Status</Th>
                        <Th isNumeric>Fare</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {report.client_fares.map((payment) => (
                        <Tr key={payment.id}>
                          <Td>
                            <Text fontWeight="700">{payment.client_name}</Text>
                            <Text fontSize="xs" color="gray.500">{payment.client_email || "No email"}</Text>
                          </Td>
                          <Td>{payment.owner_name}</Td>
                          <Td textTransform="capitalize">{payment.payment_method}</Td>
                          <Td>
                            {payment.payment_provider === "paystack"
                              ? "Paystack"
                              : payment.payment_method === "cash"
                                ? "Cash"
                                : "Legacy card payment"}
                          </Td>
                          <Td>{formatDate(payment.due_at)}</Td>
                          <Td>
                            <Badge colorScheme={payment.overdue ? "red" : payment.status === "paid" ? "green" : "orange"}>
                              {payment.overdue ? "Overdue" : payment.status}
                            </Badge>
                          </Td>
                          <Td isNumeric>{formatMoney(payment.amount_cents, payment.currency)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500">No client transport fares recorded.</Text>
              )}
            </CardBody>
          </Card>

          <Card borderRadius="2xl" border="1px solid" borderColor="gray.100">
            <CardBody>
              <Heading size="md" mb={2}>Client service fees</Heading>
              <Text color="gray.500" fontSize="sm" mb={4}>
                R5 per child, charged to the client. These fees are not owner commission debt.
              </Text>
              {(report?.client_service_fees || []).length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Client</Th>
                        <Th>Fleet owner</Th>
                        <Th>Fare method</Th>
                        <Th>Provider</Th>
                        <Th>Due date</Th>
                        <Th>Status</Th>
                        <Th isNumeric>Service fee</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {report.client_service_fees.map((fee) => (
                        <Tr key={fee.id}>
                          <Td>{fee.client_name}</Td>
                          <Td>{fee.owner_name}</Td>
                          <Td textTransform="capitalize">{fee.payment_method}</Td>
                          <Td>
                            {fee.payment_provider === "paystack"
                              ? "Paystack"
                              : fee.payment_method === "cash"
                                ? "Cash"
                                : "Legacy card payment"}
                          </Td>
                          <Td>{formatDate(fee.due_at)}</Td>
                          <Td>
                            <Badge colorScheme={fee.overdue ? "red" : fee.status === "paid" ? "green" : "orange"}>
                              {fee.overdue ? "Overdue" : fee.status}
                            </Badge>
                          </Td>
                          <Td isNumeric>{formatMoney(fee.amount_cents, fee.currency)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500">No client service fees recorded.</Text>
              )}
            </CardBody>
          </Card>

          <Card borderRadius="2xl" border="1px solid" borderColor="gray.100">
            <CardBody>
              <Flex
                justify="space-between"
                align={{ base: "stretch", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={4}
                mb={4}
              >
                <Box>
                  <Heading size="md">Legacy owner fees owing</Heading>
                  <Text color="gray.500" fontSize="sm" mt={1}>
                    Only outstanding balances from the previous owner-billed cash-fee policy.
                  </Text>
                </Box>
                <Input
                  maxW={{ base: "100%", md: "320px" }}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search legacy owner balance or email..."
                  bg="white"
                  aria-label="Search legacy owner balances"
                />
              </Flex>
              {owners.length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Fleet owner</Th>
                        <Th isNumeric>Cash payments</Th>
                        <Th isNumeric>Not invoiced</Th>
                        <Th isNumeric>Owes platform</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {owners.map((owner) => (
                        <Tr key={owner.owner_id}>
                          <Td>
                            <Text fontWeight="700" color="gray.800">
                              {owner.owner_name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {owner.email || "No billing email"}
                            </Text>
                          </Td>
                          <Td isNumeric>{owner.payment_count || 0}</Td>
                          <Td isNumeric>
                            {formatMoney(owner.not_invoiced_cents)}
                          </Td>
                          <Td isNumeric fontWeight="800" color="red.600">
                            {formatMoney(owner.owing_cents)}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text py={6} color="gray.500" textAlign="center">
                  {search
                    ? "No owners match your search."
                    : "No outstanding legacy owner fees."}
                </Text>
              )}
            </CardBody>
          </Card>

          <Card borderRadius="2xl" border="1px solid" borderColor="gray.100">
            <CardBody>
              <Box mb={4}>
                <Heading size="md">Owner cash-commission invoices</Heading>
                <Text color="gray.500" fontSize="sm" mt={1}>
                  Owner-confirmed cash-payment fees appear here; client-paid service fees are not billed to owners.
                </Text>
              </Box>
              {invoices.length ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Fleet owner</Th>
                        <Th>Period</Th>
                        <Th>Due date</Th>
                        <Th>Status</Th>
                        <Th>Provider</Th>
                        <Th isNumeric>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {invoices.map((invoice) => {
                        const badge = getInvoiceBadge(invoice.status);
                        return (
                          <Tr key={invoice.id}>
                            <Td>
                              <Text fontWeight="700" color="gray.800">
                                {invoice.owner_name}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {invoice.owner_email || "No billing email"}
                              </Text>
                            </Td>
                            <Td>
                              {invoice.period_start} – {invoice.period_end}
                            </Td>
                            <Td>{formatDate(invoice.due_at)}</Td>
                            <Td>
                              <Badge colorScheme={badge.colorScheme}>
                                {badge.label}
                              </Badge>
                            </Td>
                            <Td>
                              {invoice.payment_provider === "paystack"
                                ? "Paystack"
                                : invoice.payment_provider === "legacy"
                                  ? "Legacy card payment"
                                  : "—"}
                            </Td>
                            <Td isNumeric fontWeight="700">
                              {formatMoney(invoice.amount_cents, invoice.currency)}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text py={6} color="gray.500" textAlign="center">
                  No owner cash-commission invoices have been generated.
                </Text>
              )}
            </CardBody>
          </Card>
          <Text color="gray.500" fontSize="xs" textAlign="right">
            Refreshes every 30 seconds. Only authorized platform admins can access financial details.
          </Text>
        </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
      <Modal
        isOpen={isPayoutModalOpen}
        onClose={() => {
          closePayoutModal();
          setSelectedPayout(null);
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record owner bank transfer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="gray.600" fontSize="sm" mb={4}>
              {selectedPayout
                ? `Confirm the external ${formatMoney(
                    selectedPayout.net_payout_cents,
                  )} transfer to ${selectedPayout.owner_name}.`
                : "Confirm the completed external transfer."}
            </Text>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Bank name</FormLabel>
                <Input
                  value={transferDetails.bank_name}
                  onChange={(event) =>
                    setTransferDetails((current) => ({
                      ...current,
                      bank_name: event.target.value,
                    }))
                  }
                  maxLength={80}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Account last four digits only</FormLabel>
                <Input
                  value={transferDetails.account_last4}
                  onChange={(event) =>
                    setTransferDetails((current) => ({
                      ...current,
                      account_last4: event.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  inputMode="numeric"
                  maxLength={4}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Bank transfer reference</FormLabel>
                <Input
                  value={transferDetails.transfer_reference}
                  onChange={(event) =>
                    setTransferDetails((current) => ({
                      ...current,
                      transfer_reference: event.target.value,
                    }))
                  }
                  maxLength={120}
                />
              </FormControl>
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  Do not enter full account or card details. Only a masked
                  destination and transfer reference are stored.
                </AlertDescription>
              </Alert>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button
              variant="ghost"
              onClick={() => {
                closePayoutModal();
                setSelectedPayout(null);
              }}
            >
              Cancel
            </Button>
            <Button
              colorScheme="green"
              isLoading={
                selectedPayout && payoutActionId === selectedPayout.payout_id
              }
              isDisabled={
                !selectedPayout ||
                !isSuperAdmin ||
                transferDetails.bank_name.trim().length < 2 ||
                !/^\d{4}$/.test(transferDetails.account_last4) ||
                transferDetails.transfer_reference.trim().length < 3
              }
              onClick={() => void markOwnerPayoutPaid()}
            >
              Confirm paid
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Payments;