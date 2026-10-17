import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  X,
  ChevronRight,
  Send,
  HelpCircle,
  FileText,
  Sparkles,
  Megaphone,
  PenTool,
  PieChart,
  CheckCircle2,
  AlertCircle,
  Compass,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { SharedHeader } from '../../components/layout/SharedHeader';
import {
  Card,
  Button,
  TextField,
  TextArea,
  Accordion,
  EmptyState,
} from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import {
  FAQ_ITEMS,
  filterFaqs,
  HELP_PROBLEMS,
  DEMO_PARTNERS,
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  GUIDELINES_SECTIONS,
  FaqItem,
  CANONICAL_SLUGS,
  normalizeInfoSlug,
  validateContactInput,
} from '../../data/infoData';
import { ContactInput, ContactResponse, ContactTopic, CONTACT_TOPICS } from '@campaigns/shared';

const TOPIC_LABELS: Record<ContactTopic, string> = {
  general: 'General Inquiry',
  backing: 'Backing & Payments',
  creating: 'Campaign Creation',
  verification: 'Review & Verification',
  technical: 'Technical Support',
  refund: 'Refund Inquiry',
  other: 'Other Question',
};

export default function InfoSlugScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();

  const rawSlug = (Array.isArray(slug) ? slug[0] : slug || 'about').toLowerCase().trim();
  const title = CANONICAL_SLUGS[rawSlug];

  // Slug normalization
  const normalizedSlug = useMemo(() => normalizeInfoSlug(rawSlug), [rawSlug]);

  // FAQ Search state
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const filteredFaqs = useMemo(() => filterFaqs(faqSearchQuery, FAQ_ITEMS), [faqSearchQuery]);

  // Contact Form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState<ContactTopic>('general');
  const [contactMessage, setContactMessage] = useState('');
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactTicket, setContactTicket] = useState<string | null>(null);

  // Contact form validation
  const validateContactForm = (): boolean => {
    const result = validateContactInput({
      name: contactName,
      email: contactEmail,
      message: contactMessage,
    });
    setContactErrors(result.errors);
    return result.isValid;
  };

  const handleContactSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!validateContactForm()) return;

    setIsSubmittingContact(true);
    try {
      const payload: ContactInput = {
        name: contactName.trim(),
        email: contactEmail.trim(),
        topic: contactTopic,
        message: contactMessage.trim(),
      };

      const res = await apiClient.post<ContactResponse>('/contact', payload);
      setContactTicket(res.ticketId);
      toast.success('Your message has been sent successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleResetContact = () => {
    setContactName('');
    setContactEmail('');
    setContactTopic('general');
    setContactMessage('');
    setContactErrors({});
    setContactTicket(null);
  };

  // 1. Unknown Slug State
  if (!title) {
    return (
      <View style={styles.container}>
        <SharedHeader title="Page Not Found" fallbackRoute="/(tabs)" />
        <ScrollView contentContainerStyle={styles.centerContent}>
          <Card style={styles.notFoundCard}>
            <View style={styles.notFoundIconCircle}>
              <Compass size={36} color={theme.colors.ink600} />
            </View>
            <Text style={styles.notFoundTitle}>Page Not Found</Text>
            <Text style={styles.notFoundDescription}>
              The information page <Text style={styles.monoText}>/info/{rawSlug}</Text> does not exist.
            </Text>
            <View style={styles.recoveryActions}>
              <Button
                title="How Campaigns Works"
                variant="primary"
                size="md"
                fullWidth
                onPress={() => router.push('/info/how-it-works' as Href)}
              />
              <Button
                title="Browse FAQs"
                variant="secondary"
                size="md"
                fullWidth
                onPress={() => router.push('/info/faqs' as Href)}
              />
              <Button
                title="Return to Home"
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => router.replace('/(tabs)')}
              />
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader title={title} fallbackRoute="/(tabs)" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* 1. HOW IT WORKS */}
        {/* ========================================================================= */}
        {normalizedSlug === 'how-it-works' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>How Campaigns Works</Text>
              <Text style={styles.heroSubtitle}>
                A three-step distribution model funding digital advertising to spread public interest stories.
              </Text>
            </View>

            {/* 3-Step Visual Cards */}
            <View style={styles.stepsContainer}>
              <Card style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <PenTool size={20} color={theme.colors.primary600} />
                </View>
                <Text style={styles.stepTitle}>Create & Target</Text>
                <Text style={styles.stepBody}>
                  Creators build factual campaign stories with verified sources, craft ad visuals, select
                  distribution channels, and set their funding goal in Step 5.
                </Text>
              </Card>

              <Card style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <ShieldCheck size={20} color={theme.colors.primary600} />
                </View>
                <Text style={styles.stepTitle}>Editorial Review</Text>
                <Text style={styles.stepBody}>
                  Before publication, compliance reviewers check truthfulness, verify citation links, examine ad
                  creative compliance, and inspect targeting settings.
                </Text>
              </Card>

              <Card style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Megaphone size={20} color={theme.colors.primary600} />
                </View>
                <Text style={styles.stepTitle}>Amplify & Distribute</Text>
                <Text style={styles.stepBody}>
                  The community funds ad media. Once funded, 90% goes directly into sponsored ad placements across
                  digital feeds and networks, followed by verified performance reports.
                </Text>
              </Card>
            </View>

            {/* Core Non-Negotiable Non-Donation Sentence */}
            <View style={styles.calloutBox}>
              <ShieldCheck size={22} color={theme.colors.primary700} style={styles.calloutIcon} />
              <View style={styles.calloutTextCol}>
                <Text style={styles.calloutHeadline}>Fundamental Platform Principle</Text>
                <Text style={styles.calloutTextPrimary}>
                  Your contribution pays to spread this message. It is not a donation to the cause or the creator.
                </Text>
                <Text style={styles.calloutTextSecondary}>
                  100% of net funding strictly purchases digital advertising impressions across social feeds, search,
                  and display networks.
                </Text>
              </View>
            </View>

            {/* Detailed Plain-Language Policy Sections */}
            <Card style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>What a contribution pays for</Text>
              <Text style={styles.infoCardText}>
                Every dollar pledged goes toward delivering the campaign’s ad creative into public digital channels.
                Specifically, 90% pays for direct media placement inventory across advertising exchanges, while 10%
                funds human editorial inspection, citation verification, platform infrastructure, and card processing.
              </Text>
            </Card>

            <Card style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>What fees are</Text>
              <Text style={styles.infoCardText}>
                We maintain a flat 10% platform fee. There are no surprise creator deductions, hidden transaction
                surcharges, or tip requests. Fees are only collected when a campaign meets its funding goal and
                proceeds to advertising distribution.
              </Text>
            </Card>

            <Card style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>How reach is estimated (and why it is never guaranteed)</Text>
              <Text style={styles.infoCardText}>
                Estimated reach is modeled using benchmark Cost Per Mille (CPM) calculations across selected channels
                and regions. Because digital ad auctions fluctuate with real-time bidding, seasonality, and regional
                inventory, estimates are statistical projections and NEVER a contractual guarantee of audience size.
                Pre-campaign estimates and post-campaign verified measured reach remain strictly separate in all
                reports.
              </Text>
            </Card>

            <Card style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>What happens when a goal is not reached</Text>
              <Text style={styles.infoCardText}>
                Campaigns operates on an all-or-nothing threshold. If a campaign does not meet its creator-set funding
                goal before its deadline, advertising delivery cannot start. In this case, 100% of backer pledges are
                marked for automatic refund without deduction of platform fees.
              </Text>
            </Card>

            <Card style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>What happens after funding</Text>
              <Text style={styles.infoCardNotice}>
                "Funding completion does not automatically start advertising."
              </Text>
              <Text style={styles.infoCardText}>
                After funding closes, campaigns advance deliberately through prerequisite stages: payment settlement,
                ad asset formatting in Distribution Prep, active network delivery in Promoting, and final publication
                of a verified delivery report with measured impressions and clicks.
              </Text>
            </Card>

            {/* End Action Buttons */}
            <View style={styles.actionRow}>
              <Button
                title="Start a Campaign"
                variant="primary"
                size="lg"
                onPress={() => router.push('/(tabs)/create')}
                style={styles.flexButton}
              />
              <Button
                title="Explore Campaigns"
                variant="secondary"
                size="lg"
                onPress={() => router.push('/(tabs)/explore')}
                style={styles.flexButton}
              />
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* 2. ABOUT */}
        {/* ========================================================================= */}
        {normalizedSlug === 'about' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>About Campaigns</Text>
              <Text style={styles.heroSubtitle}>
                Empowering public interest causes with community-funded digital advertising power.
              </Text>
            </View>

            <Card style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Our Mission</Text>
              <Text style={styles.infoCardText}>
                Historically, digital advertising power has belonged almost exclusively to commercial corporations and
                wealthy entities. Grassroots initiatives, community watchdogs, and civic leaders struggle to reach beyond
                their immediate social circles.
              </Text>
              <Text style={[styles.infoCardText, { marginTop: theme.spacing.sm }]}>
                Campaigns democratizes reach by allowing communities to pool funds to run professional digital ad campaigns
                for causes that matter, delivering important narratives directly into mainstream online spaces.
              </Text>
            </Card>

            <View style={styles.principlesContainer}>
              <Text style={styles.sectionHeading}>Our Core Principles</Text>

              <Card style={styles.principleCard}>
                <View style={styles.principleHeader}>
                  <FileText size={18} color={theme.colors.primary600} />
                  <Text style={styles.principleTitle}>Sources Stay Visible</Text>
                </View>
                <Text style={styles.principleText}>
                  Every substantive claim of fact must cite verifiable public evidence. External references remain
                  accessible directly on campaign pages for transparency.
                </Text>
              </Card>

              <Card style={styles.principleCard}>
                <View style={styles.principleHeader}>
                  <PieChart size={18} color={theme.colors.primary600} />
                  <Text style={styles.principleTitle}>Funds Strictly for Distribution</Text>
                </View>
                <Text style={styles.principleText}>
                  Backer pledges strictly purchase media ad inventory to spread the message. Contributions are not
                  charitable donations or personal creator income.
                </Text>
              </Card>

              <Card style={styles.principleCard}>
                <View style={styles.principleHeader}>
                  <ShieldCheck size={18} color={theme.colors.primary600} />
                  <Text style={styles.principleTitle}>Independent Review Before Launch</Text>
                </View>
                <Text style={styles.principleText}>
                  No campaign goes live without independent editorial inspection. Story claims, citations, ad copy,
                  and audience targeting are verified before funding opens.
                </Text>
              </Card>

              <Card style={styles.principleCard}>
                <View style={styles.principleHeader}>
                  <ShieldAlert size={18} color={theme.colors.primary600} />
                  <Text style={styles.principleTitle}>Privacy by Default</Text>
                </View>
                <Text style={styles.principleText}>
                  Backer identities, emails, and pledge amounts are private by default. Your information is never sold,
                  shared with ad recipients, or publicized.
                </Text>
              </Card>
            </View>

            {/* Prototype Notice */}
            <View style={styles.prototypeBox}>
              <Sparkles size={18} color="#92400E" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prototypeHeadline}>Prototype Demonstration Notice</Text>
                <Text style={styles.prototypeText}>
                  Campaigns is an experimental prototype application. All campaigns, metrics, backer contributions,
                  and performance telemetry are operating on demonstration fixtures and sandbox infrastructure.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* 3. PARTNERS */}
        {/* ========================================================================= */}
        {normalizedSlug === 'partners' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>Distribution Partners</Text>
              <Text style={styles.heroSubtitle}>
                How programmatic advertising exchanges deliver campaign messages to target audiences.
              </Text>
            </View>

            <Card style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>How Distribution Partners Fit In</Text>
              <Text style={styles.infoCardText}>
                When a campaign achieves its funding goal, Campaigns syndicates verified ad creatives across
                programmatic advertising exchanges, search networks, and display networks to reach citizens in chosen
                geographic regions.
              </Text>
            </Card>

            <Text style={styles.sectionHeading}>Distribution Network Placeholders</Text>

            <View style={styles.partnersList}>
              {DEMO_PARTNERS.map((partner) => (
                <Card key={partner.id} style={styles.partnerCard}>
                  <View style={styles.partnerHeader}>
                    <Text style={styles.partnerName}>{partner.name}</Text>
                    <View style={styles.demoBadge}>
                      <Text style={styles.demoBadgeText}>{partner.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.partnerRole}>{partner.role}</Text>
                  <Text style={styles.partnerDesc}>{partner.description}</Text>
                </Card>
              ))}
            </View>

            {/* Non-Endorsement Callout */}
            <View style={styles.nonEndorsementBox}>
              <AlertCircle size={18} color={theme.colors.ink600} style={{ marginTop: 2 }} />
              <Text style={styles.nonEndorsementText}>
                <Text style={{ fontFamily: theme.typography.fonts.uiSemiBold }}>Demonstration Notice:</Text> The partners
                listed above are illustrative placeholders created for demonstration. Campaigns does not claim commercial
                partnerships, formal third-party certifications, or corporate endorsements in this prototype environment.
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* 4. FAQS */}
        {/* ========================================================================= */}
        {normalizedSlug === 'faqs' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
              <Text style={styles.heroSubtitle}>
                Everything you need to know about backing, creating, fees, reach estimates, and privacy.
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextField
                placeholder="Search questions (e.g. donation, refund, CPM)..."
                value={faqSearchQuery}
                onChangeText={setFaqSearchQuery}
                rightAccessory={
                  faqSearchQuery ? (
                    <Pressable
                      onPress={() => setFaqSearchQuery('')}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
                      <X size={18} color={theme.colors.ink500} />
                    </Pressable>
                  ) : (
                    <Search size={18} color={theme.colors.ink500} />
                  )
                }
              />
            </View>

            {/* Filtered Results */}
            {filteredFaqs.length === 0 ? (
              <EmptyState
                title="No questions found"
                description={`We couldn't find any questions matching "${faqSearchQuery}". Try using different search keywords or clear your query.`}
                actionTitle="Clear Search"
                onAction={() => setFaqSearchQuery('')}
                icon={<HelpCircle size={32} color={theme.colors.ink400} />}
              />
            ) : (
              <View style={styles.faqList}>
                {faqSearchQuery ? (
                  <View style={styles.searchResultsHeader}>
                    <Text style={styles.searchResultsCount}>
                      Found {filteredFaqs.length} matching {filteredFaqs.length === 1 ? 'question' : 'questions'}:
                    </Text>
                  </View>
                ) : null}

                {filteredFaqs.map((faq: FaqItem, idx: number) => (
                  <Accordion
                    key={faq.id}
                    title={faq.question}
                    defaultOpen={idx === 0 && !faqSearchQuery}
                    style={styles.faqAccordion}
                  >
                    <View style={styles.faqAnswerBox}>
                      <View style={styles.faqCategoryBadge}>
                        <Text style={styles.faqCategoryText}>{faq.category}</Text>
                      </View>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  </Accordion>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 5. HELP */}
        {/* ========================================================================= */}
        {normalizedSlug === 'help' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>Help & Common Problems</Text>
              <Text style={styles.heroSubtitle}>
                Quick troubleshooting solutions and direct navigation links for common scenarios.
              </Text>
            </View>

            <View style={styles.problemsList}>
              {HELP_PROBLEMS.map((prob) => (
                <Card key={prob.id} style={styles.problemCard}>
                  <View style={styles.problemContent}>
                    <Text style={styles.problemTitle}>{prob.title}</Text>
                    <Text style={styles.problemDesc}>{prob.description}</Text>
                  </View>
                  <Button
                    title={prob.actionLabel}
                    variant="secondary"
                    size="sm"
                    iconRight={<ChevronRight size={16} color={theme.colors.primary600} />}
                    onPress={() => router.push(prob.targetRoute as Href)}
                    style={styles.problemButton}
                  />
                </Card>
              ))}
            </View>

            {/* Direct Contact Prompt */}
            <Card style={styles.contactSupportCard}>
              <View style={styles.contactSupportHeader}>
                <HelpCircle size={22} color={theme.colors.primary600} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactSupportTitle}>Still need assistance?</Text>
                  <Text style={styles.contactSupportBody}>
                    Our support and compliance staff are here to help answer questions about your campaigns or pledges.
                  </Text>
                </View>
              </View>
              <Button
                title="Contact Support"
                variant="primary"
                size="md"
                fullWidth
                onPress={() => router.push('/info/contact' as Href)}
              />
            </Card>
          </View>
        )}

        {/* ========================================================================= */}
        {/* 6. CONTACT */}
        {/* ========================================================================= */}
        {normalizedSlug === 'contact' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>Contact Support</Text>
              <Text style={styles.heroSubtitle}>
                Send a message to our support and editorial compliance team.
              </Text>
            </View>

            {contactTicket ? (
              <Card style={styles.contactSuccessCard}>
                <CheckCircle2 size={48} color={theme.colors.emerald600} />
                <Text style={styles.contactSuccessTitle}>Message Received!</Text>
                <Text style={styles.contactSuccessBody}>
                  Thank you for reaching out. Your support inquiry has been submitted and registered under:
                </Text>
                <View style={styles.ticketPill}>
                  <Text style={styles.ticketPillText}>{contactTicket}</Text>
                </View>
                <Text style={styles.contactSuccessFootnote}>
                  We do not store your personal credentials in operational logs. A team member will review your message.
                </Text>
                <Button
                  title="Send Another Message"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onPress={handleResetContact}
                  style={{ marginTop: theme.spacing.sm }}
                />
              </Card>
            ) : (
              <Card style={styles.contactFormCard}>
                <TextField
                  label="Your Name *"
                  placeholder="e.g. Jordan Public"
                  value={contactName}
                  onChangeText={setContactName}
                  error={contactErrors.name}
                  maxLength={100}
                />

                <TextField
                  label="Email Address *"
                  placeholder="e.g. jordan@example.com"
                  value={contactEmail}
                  onChangeText={setContactEmail}
                  error={contactErrors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* Topic Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Inquiry Topic *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.topicChipsScroll}
                  >
                    {CONTACT_TOPICS.map((topic) => {
                      const isSelected = contactTopic === topic;
                      return (
                        <Pressable
                          key={topic}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setContactTopic(topic);
                          }}
                          style={[styles.topicChip, isSelected && styles.topicChipSelected]}
                          accessibilityRole="button"
                          accessibilityLabel={TOPIC_LABELS[topic]}
                        >
                          <Text style={[styles.topicChipText, isSelected && styles.topicChipTextSelected]}>
                            {TOPIC_LABELS[topic]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Message */}
                <TextArea
                  label="Message *"
                  placeholder="Describe your inquiry in detail (minimum 10 characters)..."
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  error={contactErrors.message}
                  maxLength={2000}
                  showCounter
                  numberOfLines={5}
                />

                <Button
                  title="Submit Inquiry"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isSubmittingContact}
                  iconRight={<Send size={18} color="#FFFFFF" />}
                  onPress={handleContactSubmit}
                  style={{ marginTop: theme.spacing.xs }}
                />
              </Card>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 7. TERMS OF SERVICE */}
        {/* ========================================================================= */}
        {normalizedSlug === 'terms' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>Terms of Service</Text>
              <Text style={styles.heroSubtitle}>
                Operating terms governing campaign creation, community backing, ad delivery, and fees.
              </Text>
            </View>

            <View style={styles.legalNoticeBanner}>
              <ShieldAlert size={16} color="#92400E" />
              <Text style={styles.legalNoticeText}>
                Prototype Document — Not Legal Advice. Written for demonstration and architectural testing.
              </Text>
            </View>

            {TERMS_SECTIONS.map((sec, idx) => (
              <Card key={idx} style={styles.legalCard}>
                <Text style={styles.legalSectionTitle}>{sec.title}</Text>
                {sec.paragraphs.map((para, pIdx) => (
                  <Text key={pIdx} style={styles.legalParagraph}>
                    {para}
                  </Text>
                ))}
              </Card>
            ))}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 8. PRIVACY POLICY */}
        {/* ========================================================================= */}
        {normalizedSlug === 'privacy' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>Privacy Policy</Text>
              <Text style={styles.heroSubtitle}>
                How we protect backer identities, tokenized payments, and platform telemetry.
              </Text>
            </View>

            <View style={styles.legalNoticeBanner}>
              <ShieldAlert size={16} color="#92400E" />
              <Text style={styles.legalNoticeText}>
                Prototype Document — Not Legal Advice. Written for demonstration and architectural testing.
              </Text>
            </View>

            {PRIVACY_SECTIONS.map((sec, idx) => (
              <Card key={idx} style={styles.legalCard}>
                <Text style={styles.legalSectionTitle}>{sec.title}</Text>
                {sec.paragraphs.map((para, pIdx) => (
                  <Text key={pIdx} style={styles.legalParagraph}>
                    {para}
                  </Text>
                ))}
              </Card>
            ))}
          </View>
        )}

        {/* ========================================================================= */}
        {/* 9. COMMUNITY GUIDELINES */}
        {/* ========================================================================= */}
        {normalizedSlug === 'community-guidelines' && (
          <View style={styles.pageSection}>
            <View style={styles.heroIntro}>
              <Text style={styles.heroTitle}>Community Guidelines</Text>
              <Text style={styles.heroSubtitle}>
                Editorial standards, mandatory source verification, prohibited content, and moderation.
              </Text>
            </View>

            <View style={styles.legalNoticeBanner}>
              <ShieldAlert size={16} color="#92400E" />
              <Text style={styles.legalNoticeText}>
                Prototype Document — Not Legal Advice. Written for demonstration and architectural testing.
              </Text>
            </View>

            {GUIDELINES_SECTIONS.map((sec, idx) => (
              <Card key={idx} style={styles.legalCard}>
                <Text style={styles.legalSectionTitle}>{sec.title}</Text>
                {sec.paragraphs.map((para, pIdx) => (
                  <Text key={pIdx} style={styles.legalParagraph}>
                    {para}
                  </Text>
                ))}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  centerContent: {
    padding: theme.spacing.xl,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSection: {
    gap: theme.spacing.base,
  },
  heroIntro: {
    gap: 4,
    marginBottom: theme.spacing.xs,
  },
  heroTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 24,
    lineHeight: 30,
    color: theme.colors.ink900,
  },
  heroSubtitle: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink600,
  },
  stepsContainer: {
    gap: theme.spacing.md,
  },
  stepCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontFamily: theme.typography.fonts.uiBold,
    fontSize: 13,
    color: theme.colors.primary700,
  },
  stepTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 16,
    color: theme.colors.ink900,
  },
  stepBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink700,
  },
  calloutBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary50,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    gap: theme.spacing.sm,
  },
  calloutIcon: {
    marginTop: 2,
  },
  calloutTextCol: {
    flex: 1,
    gap: 4,
  },
  calloutHeadline: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 12,
    color: theme.colors.primary800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutTextPrimary: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.primary800,
  },
  calloutTextSecondary: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.primary700,
  },
  infoCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  infoCardTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 17,
    color: theme.colors.ink900,
  },
  infoCardNotice: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.primary700,
    fontStyle: 'italic',
  },
  infoCardText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.ink700,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  sectionHeading: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 18,
    color: theme.colors.ink900,
    marginTop: theme.spacing.xs,
  },
  principlesContainer: {
    gap: theme.spacing.md,
  },
  principleCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  principleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  principleTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.ink900,
  },
  principleText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink700,
  },
  prototypeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warningBg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: theme.spacing.sm,
  },
  prototypeHeadline: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: '#92400E',
    marginBottom: 2,
  },
  prototypeText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: '#78350F',
  },
  partnersList: {
    gap: theme.spacing.md,
  },
  partnerCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerName: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 16,
    color: theme.colors.ink900,
  },
  demoBadge: {
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  demoBadgeText: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 10,
    color: theme.colors.ink600,
  },
  partnerRole: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.primary700,
  },
  partnerDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink700,
  },
  nonEndorsementBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgMuted,
    padding: theme.spacing.md,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: theme.spacing.sm,
  },
  nonEndorsementText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.ink600,
  },
  searchContainer: {
    marginBottom: theme.spacing.xs,
  },
  searchResultsHeader: {
    marginBottom: theme.spacing.xs,
  },
  searchResultsCount: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 13,
    color: theme.colors.ink600,
  },
  faqList: {
    gap: theme.spacing.sm,
  },
  faqAccordion: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  faqAnswerBox: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.base,
    gap: theme.spacing.xs,
  },
  faqCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.bgMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  faqCategoryText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 10,
    color: theme.colors.ink500,
  },
  faqAnswerText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.ink800,
  },
  problemsList: {
    gap: theme.spacing.md,
  },
  problemCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  problemContent: {
    gap: 4,
  },
  problemTitle: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: 15,
    color: theme.colors.ink900,
  },
  problemDesc: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink600,
  },
  problemButton: {
    alignSelf: 'flex-start',
  },
  contactSupportCard: {
    padding: theme.spacing.xl,
    gap: theme.spacing.base,
    marginTop: theme.spacing.xs,
  },
  contactSupportHeader: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  contactSupportTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 16,
    color: theme.colors.ink900,
  },
  contactSupportBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink600,
  },
  contactFormCard: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 13,
    color: theme.colors.ink800,
  },
  topicChipsScroll: {
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  topicChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bgMuted,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  topicChipSelected: {
    backgroundColor: theme.colors.primary600,
    borderColor: theme.colors.primary600,
  },
  topicChipText: {
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 12,
    color: theme.colors.ink700,
  },
  topicChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: theme.typography.fonts.uiSemiBold,
  },
  contactSuccessCard: {
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  contactSuccessTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 20,
    color: theme.colors.ink900,
    textAlign: 'center',
  },
  contactSuccessBody: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink700,
    textAlign: 'center',
  },
  ticketPill: {
    backgroundColor: theme.colors.primary50,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginVertical: theme.spacing.xs,
  },
  ticketPillText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary800,
  },
  contactSuccessFootnote: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 12,
    color: theme.colors.ink500,
    textAlign: 'center',
  },
  legalNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningBg,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  legalNoticeText: {
    flex: 1,
    fontFamily: theme.typography.fonts.uiMedium,
    fontSize: 11,
    color: '#92400E',
  },
  legalCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  legalSectionTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 16,
    color: theme.colors.ink900,
  },
  legalParagraph: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.ink800,
  },
  notFoundCard: {
    width: '100%',
    maxWidth: 420,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  notFoundIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTitle: {
    fontFamily: theme.typography.fonts.serifBold,
    fontSize: 20,
    color: theme.colors.ink900,
    textAlign: 'center',
  },
  notFoundDescription: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink700,
    textAlign: 'center',
  },
  monoText: {
    fontFamily: 'monospace',
    color: theme.colors.primary700,
  },
  recoveryActions: {
    width: '100%',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
