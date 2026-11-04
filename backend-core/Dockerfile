# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy source code and database resource
COPY backend-core/ .
COPY database/ /database/

# Restore and publish in Release mode
RUN dotnet restore src/EventPass.API/EventPass.API.csproj
RUN dotnet publish src/EventPass.API/EventPass.API.csproj -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

ENTRYPOINT ["dotnet", "EventPass.API.dll"]
