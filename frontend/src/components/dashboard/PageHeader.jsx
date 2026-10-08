import React from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";

const PageHeader = ({ eyebrow, title, description, actions, meta }) => (
  <Flex
    as="header"
    align={{ base: "flex-start", lg: "center" }}
    justify="space-between"
    gap={4}
    mb={6}
    wrap="wrap"
    width="100%"
  >
    <Box minW={0}>
      {eyebrow ? (
        <Text
          color="blue.600"
          fontSize="xs"
          fontWeight="800"
          letterSpacing="1.5px"
          mb={1}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Heading size={{ base: "lg", md: "xl" }} color="gray.800">
        {title}
      </Heading>
      {description ? (
        <Text color="gray.600" fontSize="sm" mt={1}>
          {description}
        </Text>
      ) : null}
      {meta ? <Box mt={2}>{meta}</Box> : null}
    </Box>
    {actions ? <Box flexShrink={0}>{actions}</Box> : null}
  </Flex>
);

export default PageHeader;
